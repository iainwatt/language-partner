package expo.modules.phraseselection

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.text.Spannable
import android.text.SpannableString
import android.text.style.ForegroundColorSpan
import android.text.style.StyleSpan
import android.util.TypedValue
import android.view.ActionMode
import android.view.Menu
import android.view.MenuItem
import android.widget.TextView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlin.math.ceil

class PhraseSelectionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PhraseSelection")
    View(PhraseSelectionView::class) {
      Events("onSavePhrase", "onContentHeight")
      Prop("text") { view: PhraseSelectionView, text: String -> view.setText(text) }
      Prop("selectionEnabled") { view: PhraseSelectionView, enabled: Boolean ->
        view.textView.setTextIsSelectable(enabled)
      }
      Prop("fontScale") { view: PhraseSelectionView, scale: Float -> view.setFontScale(scale) }
      Prop("serif") { view: PhraseSelectionView, serif: Boolean -> view.setSerif(serif) }
      Prop("accentRanges") { view: PhraseSelectionView, ranges: String -> view.setAccentRanges(ranges) }
    }
  }
}

class PhraseSelectionView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  override val shouldUseAndroidLayout = true
  private val onSavePhrase by EventDispatcher()
  private val onContentHeight by EventDispatcher()
  private var reportedHeight = 0
  private val saveId = 0x4C50
  private var usesSerif = false
  private var typographyScale = resources.configuration.fontScale
  private var sourceText = ""
  private var accentRanges = emptyList<Pair<Int, Int>>()
  val textView = TextView(context)

  init {
    textView.setPadding(0, 0, 0, 0)
    textView.includeFontPadding = false
    textView.setTextColor(Color.rgb(41, 45, 42))
    textView.highlightColor = Color.argb(90, 82, 119, 109)
    textView.setTextIsSelectable(true)
    setFontScale(resources.configuration.fontScale)
    textView.customSelectionActionModeCallback = object : ActionMode.Callback {
      override fun onCreateActionMode(mode: ActionMode, menu: Menu): Boolean {
        menu.add(Menu.NONE, saveId, 0, "Save phrase").setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS)
        return true
      }
      override fun onPrepareActionMode(mode: ActionMode, menu: Menu): Boolean = false
      override fun onDestroyActionMode(mode: ActionMode) {}
      override fun onActionItemClicked(mode: ActionMode, item: MenuItem): Boolean {
        if (item.itemId != saveId) return false
        val start = minOf(textView.selectionStart, textView.selectionEnd)
        val end = maxOf(textView.selectionStart, textView.selectionEnd)
        val source = textView.text.toString()
        if (textView.isTextSelectable && start >= 0 && end > start && end <= source.length) {
          onSavePhrase(mapOf(
            "start" to start,
            "end" to end,
            "text" to source.substring(start, end),
            "sourceText" to source
          ))
        }
        mode.finish()
        return true
      }
    }
    addView(textView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  fun setText(text: String) {
    if (sourceText == text) return
    sourceText = text
    updateText()
  }

  fun setAccentRanges(json: String) {
    accentRanges = try {
      val values = org.json.JSONArray(json)
      (0 until values.length()).mapNotNull { index ->
        val value = values.getJSONObject(index)
        val start = value.getInt("start")
        val end = value.getInt("end")
        if (start >= 0 && end > start) start to end else null
      }
    } catch (_: Exception) {
      emptyList()
    }
    updateText()
  }

  private fun updateText() {
    val styled = SpannableString(sourceText)
    accentRanges.forEach { (start, end) ->
      if (end <= sourceText.length) {
        styled.setSpan(
          ForegroundColorSpan(Color.rgb(168, 68, 61)),
          start,
          end,
          Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
        )
        styled.setSpan(
          StyleSpan(Typeface.BOLD),
          start,
          end,
          Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
        )
      }
    }
    textView.text = styled
    requestLayout()
  }

  fun setFontScale(scale: Float) {
    typographyScale = scale
    val density = resources.displayMetrics.density
    textView.setTextSize(TypedValue.COMPLEX_UNIT_PX, (if (usesSerif) 18 else 17) * scale * density)
    val metrics = textView.paint.fontMetrics
    textView.setLineSpacing((if (usesSerif) 28 else 25) * scale * density - (metrics.descent - metrics.ascent), 1f)
    requestLayout()
  }

  fun setSerif(value: Boolean) {
    usesSerif = value
    textView.typeface = if (value) Typeface.SERIF else Typeface.DEFAULT
    setFontScale(typographyScale)
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    val width = right - left
    if (width <= 0) return
    textView.measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED)
    )
    val height = ceil(textView.measuredHeight / resources.displayMetrics.density).toInt()
    textView.layout(0, 0, width, bottom - top)
    if (height > 0 && height != reportedHeight) {
      reportedHeight = height
      onContentHeight(mapOf("height" to height))
    }
  }
}
