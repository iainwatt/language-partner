import ExpoModulesCore
import UIKit

public class PhraseSelectionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PhraseSelection")
    View(PhraseSelectionView.self) {
      Events("onSavePhrase", "onContentHeight")
      Prop("text") { (view: PhraseSelectionView, text: String) in
        view.setText(text)
      }
      Prop("selectionEnabled") { (view: PhraseSelectionView, enabled: Bool) in
        view.textView.isSelectable = enabled
      }
      Prop("fontScale") { (view: PhraseSelectionView, scale: Double) in
        view.fontScale = CGFloat(scale)
        view.updateText()
      }
      Prop("serif") { (view: PhraseSelectionView, serif: Bool) in
        view.serif = serif
        view.updateText()
      }
      Prop("accentRanges") { (view: PhraseSelectionView, ranges: String) in
        view.setAccentRanges(ranges)
      }
    }
  }
}

// iOS 15 uses UIMenuController; iOS 16+ uses the UITextView delegate menu.
final class PhraseTextView: UITextView {
  var savePhrase: (() -> Void)?
  private var previousItems: [UIMenuItem]?

  override func becomeFirstResponder() -> Bool {
    let became = super.becomeFirstResponder()
    if became, #unavailable(iOS 16.0) {
      previousItems = UIMenuController.shared.menuItems
      UIMenuController.shared.menuItems = [
        UIMenuItem(title: "Save phrase", action: #selector(saveHighlightedPhrase))
      ]
    }
    return became
  }

  override func resignFirstResponder() -> Bool {
    let resigned = super.resignFirstResponder()
    if resigned, #unavailable(iOS 16.0) {
      UIMenuController.shared.menuItems = previousItems
      previousItems = nil
    }
    return resigned
  }

  override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
    if action == #selector(saveHighlightedPhrase) {
      return isSelectable && selectedRange.length > 0
    }
    return super.canPerformAction(action, withSender: sender)
  }

  @objc private func saveHighlightedPhrase() {
    savePhrase?()
  }
}

final class PhraseSelectionView: ExpoView, UITextViewDelegate {
  let textView = PhraseTextView()
  let onSavePhrase = EventDispatcher()
  let onContentHeight = EventDispatcher()
  var fontScale: CGFloat = 1
  var serif = false
  private var sourceText = ""
  private var accentRanges: [NSRange] = []
  private var reportedHeight: CGFloat = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    textView.isEditable = false
    textView.isSelectable = true
    textView.isScrollEnabled = false
    textView.backgroundColor = .clear
    textView.textContainerInset = .zero
    textView.textContainer.lineFragmentPadding = 0
    textView.tintColor = UIColor(red: 82/255, green: 119/255, blue: 109/255, alpha: 1)
    textView.delegate = self
    textView.savePhrase = { [weak self] in self?.saveSelection() }
    addSubview(textView)
  }

  func setText(_ text: String) {
    guard text != sourceText else { return }
    sourceText = text
    updateText()
  }

  func setAccentRanges(_ json: String) {
    guard let data = json.data(using: .utf8),
      let values = try? JSONSerialization.jsonObject(with: data) as? [[String: Int]] else {
      accentRanges = []
      updateText()
      return
    }
    accentRanges = values.compactMap { value in
      guard let start = value["start"], let end = value["end"],
        start >= 0, end > start else { return nil }
      return NSRange(location: start, length: end - start)
    }
    updateText()
  }

  func updateText() {
    let paragraph = NSMutableParagraphStyle()
    paragraph.minimumLineHeight = (serif ? 28 : 25) * fontScale
    paragraph.maximumLineHeight = (serif ? 28 : 25) * fontScale
    let size = (serif ? 18 : 17) * fontScale
    let font = serif ? (UIFont(name: "Georgia", size: size) ?? UIFont.systemFont(ofSize: size)) : UIFont.systemFont(ofSize: size)
    let attributed = NSMutableAttributedString(string: sourceText, attributes: [
      .font: font,
      .foregroundColor: UIColor(red: 41/255, green: 45/255, blue: 42/255, alpha: 1),
      .paragraphStyle: paragraph
    ])
    let sourceLength = (sourceText as NSString).length
    let accentColor = UIColor(red: 168/255, green: 68/255, blue: 61/255, alpha: 1)
    for range in accentRanges where NSMaxRange(range) <= sourceLength {
      attributed.addAttributes([
        .foregroundColor: accentColor,
        .font: serif
          ? (UIFont(name: "Georgia-Bold", size: size) ?? UIFont.boldSystemFont(ofSize: size))
          : UIFont.boldSystemFont(ofSize: size)
      ], range: range)
    }
    textView.attributedText = attributed
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    textView.frame = bounds
    guard bounds.width > 0 else { return }
    let height = ceil(textView.sizeThatFits(
      CGSize(width: bounds.width, height: .greatestFiniteMagnitude)
    ).height)
    if height > 0 && height != reportedHeight {
      reportedHeight = height
      onContentHeight(["height": height])
    }
  }

  func textView(
    _ textView: UITextView,
    editMenuForTextIn range: NSRange,
    suggestedActions: [UIMenuElement]
  ) -> UIMenu? {
    guard range.length > 0, textView.isSelectable else { return nil }
    let save = UIAction(title: "Save phrase", image: UIImage(systemName: "bookmark")) {
      [weak self] _ in
      self?.saveSelection()
    }
    return UIMenu(children: [save] + suggestedActions)
  }

  private func saveSelection() {
    let range = textView.selectedRange
    let source = sourceText as NSString
    guard textView.isSelectable, range.location != NSNotFound,
      range.length > 0, NSMaxRange(range) <= source.length else { return }
    onSavePhrase([
      "start": range.location,
      "end": NSMaxRange(range),
      "text": source.substring(with: range),
      "sourceText": sourceText
    ])
    textView.selectedRange = NSRange(location: range.location, length: 0)
    textView.resignFirstResponder()
  }
}
