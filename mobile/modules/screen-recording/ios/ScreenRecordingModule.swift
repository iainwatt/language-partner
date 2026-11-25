import AVFoundation
import CoreImage
import ExpoModulesCore
import ReplayKit
import UIKit

// Records the app's own screen, with the learner's voice from the microphone,
// to a video file. One rectangle of the screen is covered in every frame of
// the file by a card: a still picture with a few lines of text over it. The
// learner goes on seeing what is really there; only the saved clip is covered.
// It is how a practice take can show the words and the learner's face without
// carrying the footage of the video they are following.
struct ScreenRecordingOptions: Record {
  // The rectangle to cover, in points from the top left of the screen.
  @Field var x: Double = 0
  @Field var y: Double = 0
  @Field var width: Double = 0
  @Field var height: Double = 0
  // Up to three lines for the card: the first is set larger.
  @Field var lines: [String] = []
  // A picture to show behind the text, fetched once before recording starts.
  @Field var image: String = ""
}

public class ScreenRecordingModule: Module {
  private let clip = ScreenClip()

  public func definition() -> ModuleDefinition {
    Name("ScreenRecording")

    AsyncFunction("start") { (options: ScreenRecordingOptions, promise: Promise) in
      self.clip.start(options: options) { error in
        if let error = error {
          promise.reject("ERR_SCREEN_RECORDING", error)
        } else {
          promise.resolve(nil)
        }
      }
    }

    AsyncFunction("stop") { (promise: Promise) in
      self.clip.stop { url, milliseconds, error in
        if let url = url {
          promise.resolve(["uri": url.absoluteString, "durationMs": milliseconds])
        } else {
          promise.reject("ERR_SCREEN_RECORDING", error ?? "Nothing was recorded.")
        }
      }
    }

    AsyncFunction("discard") { (uri: String) in
      if let url = URL(string: uri), url.isFileURL {
        try? FileManager.default.removeItem(at: url)
      }
    }
  }
}

final class ScreenClip {
  private let queue = DispatchQueue(label: "languagepartner.screen-clip")
  private let context = CIContext()
  private var writer: AVAssetWriter?
  private var video: AVAssetWriterInput?
  private var adaptor: AVAssetWriterInputPixelBufferAdaptor?
  private var audio: AVAssetWriterInput?
  private var url: URL?
  private var card: CIImage?
  // The covered rectangle as fractions of the screen, from the top left.
  private var cover = CGRect.zero
  private var size = CGSize.zero
  private var first: CMTime?
  private var last: CMTime?
  private var failed: String?
  private var running = false

  func start(options: ScreenRecordingOptions, completion: @escaping (String?) -> Void) {
    let recorder = RPScreenRecorder.shared()
    guard recorder.isAvailable else { return completion("Screen recording is not available on this phone just now.") }
    guard !recorder.isRecording, !running else { return completion("A recording is already under way.") }
    let bounds = UIScreen.main.bounds
    let scale = UIScreen.main.scale
    let covered = CGRect(x: options.x, y: options.y, width: options.width, height: options.height)
    let begin: (UIImage?) -> Void = { picture in
      DispatchQueue.main.async {
        self.queue.sync {
          self.writer = nil; self.video = nil; self.adaptor = nil; self.audio = nil
          self.first = nil; self.last = nil; self.failed = nil; self.size = .zero
          self.url = FileManager.default.temporaryDirectory.appendingPathComponent("practice-\(UUID().uuidString).mp4")
          if covered.width > 0, covered.height > 0, bounds.width > 0, bounds.height > 0 {
            self.cover = CGRect(x: covered.minX / bounds.width, y: covered.minY / bounds.height,
                                width: covered.width / bounds.width, height: covered.height / bounds.height)
            self.card = ScreenClip.drawCard(size: CGSize(width: covered.width * scale, height: covered.height * scale),
                                            lines: options.lines, picture: picture)
          } else {
            self.cover = .zero
            self.card = nil
          }
        }
        recorder.isMicrophoneEnabled = true
        recorder.startCapture(handler: { sample, kind, error in
          guard error == nil else { return }
          self.queue.sync { self.take(sample, kind) }
        }, completionHandler: { error in
          self.running = error == nil
          completion(error?.localizedDescription)
        })
      }
    }
    // The picture is fetched first, and briefly: a slow connection must not hold up the take.
    guard let address = URL(string: options.image), !options.image.isEmpty else { return begin(nil) }
    var request = URLRequest(url: address)
    request.timeoutInterval = 4
    URLSession.shared.dataTask(with: request) { data, _, _ in
      begin(data.flatMap { UIImage(data: $0) })
    }.resume()
  }

  func stop(completion: @escaping (URL?, Double, String?) -> Void) {
    guard running else { return completion(nil, 0, "No recording is under way.") }
    running = false
    RPScreenRecorder.shared().stopCapture { error in
      self.queue.async {
        guard let writer = self.writer, writer.status == .writing, let first = self.first, let last = self.last else {
          let reason = self.failed ?? self.writer?.error?.localizedDescription ?? error?.localizedDescription
          self.writer?.cancelWriting()
          self.writer = nil
          return completion(nil, 0, reason ?? "Nothing was recorded.")
        }
        self.video?.markAsFinished()
        self.audio?.markAsFinished()
        let url = self.url
        let milliseconds = max(0, CMTimeGetSeconds(CMTimeSubtract(last, first)) * 1000)
        writer.finishWriting {
          let finished = writer.status == .completed
          self.queue.async { self.writer = nil }
          completion(finished ? url : nil, milliseconds.rounded(), finished ? nil : writer.error?.localizedDescription)
        }
      }
    }
  }

  // Called for every frame of the screen and every piece of sound, in order.
  private func take(_ sample: CMSampleBuffer, _ kind: RPSampleBufferType) {
    guard CMSampleBufferDataIsReady(sample), failed == nil else { return }
    let time = CMSampleBufferGetPresentationTimeStamp(sample)
    switch kind {
    case .video:
      guard let frame = CMSampleBufferGetImageBuffer(sample) else { return }
      if writer == nil { prepare(width: CVPixelBufferGetWidth(frame), height: CVPixelBufferGetHeight(frame), at: time) }
      guard let writer = writer, writer.status == .writing, let video = video, video.isReadyForMoreMediaData,
        let pool = adaptor?.pixelBufferPool else { return }
      var made: CVPixelBuffer?
      CVPixelBufferPoolCreatePixelBuffer(nil, pool, &made)
      guard let target = made else { return }
      var picture = CIImage(cvPixelBuffer: frame)
      if picture.extent.width != size.width || picture.extent.height != size.height, picture.extent.width > 0, picture.extent.height > 0 {
        picture = picture.transformed(by: CGAffineTransform(scaleX: size.width / picture.extent.width, y: size.height / picture.extent.height))
      }
      if let card = card, cover.width > 0, card.extent.width > 0, card.extent.height > 0 {
        // Core Image measures from the bottom left; the rectangle was given from the top left.
        let place = CGRect(x: cover.minX * size.width, y: (1 - cover.maxY) * size.height,
                           width: cover.width * size.width, height: cover.height * size.height)
        let fitted = card
          .transformed(by: CGAffineTransform(scaleX: place.width / card.extent.width, y: place.height / card.extent.height))
          .transformed(by: CGAffineTransform(translationX: place.minX, y: place.minY))
        picture = fitted.composited(over: picture)
      }
      context.render(picture, to: target, bounds: CGRect(origin: .zero, size: size), colorSpace: CGColorSpaceCreateDeviceRGB())
      if adaptor?.append(target, withPresentationTime: time) == true {
        last = time
      } else if writer.status == .failed {
        failed = writer.error?.localizedDescription ?? "The clip could not be written."
      }
    case .audioMic:
      // Sound is kept only once the picture has begun, so the clip never opens on a black frame.
      guard let writer = writer, writer.status == .writing, first != nil, let audio = audio, audio.isReadyForMoreMediaData else { return }
      audio.append(sample)
    default:
      break
    }
  }

  // The file is set up from the first frame, which is what tells us how large the picture is.
  private func prepare(width: Int, height: Int, at time: CMTime) {
    guard let url = url, width > 0, height > 0 else { failed = "The screen could not be read."; return }
    do {
      // H.264 wants even dimensions.
      let even = CGSize(width: width - width % 2, height: height - height % 2)
      let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
      let video = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: Int(even.width),
        AVVideoHeightKey: Int(even.height),
        AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 6_000_000]
      ])
      video.expectsMediaDataInRealTime = true
      let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: video, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: Int(even.width),
        kCVPixelBufferHeightKey as String: Int(even.height)
      ])
      let audio = AVAssetWriterInput(mediaType: .audio, outputSettings: [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: 44100,
        AVNumberOfChannelsKey: 1,
        AVEncoderBitRateKey: 96_000
      ])
      audio.expectsMediaDataInRealTime = true
      guard writer.canAdd(video), writer.canAdd(audio) else { failed = "The clip could not be set up."; return }
      writer.add(video)
      writer.add(audio)
      guard writer.startWriting() else { failed = writer.error?.localizedDescription ?? "The clip could not be started."; return }
      writer.startSession(atSourceTime: time)
      self.writer = writer
      self.video = video
      self.adaptor = adaptor
      self.audio = audio
      self.size = even
      self.first = time
    } catch {
      failed = error.localizedDescription
    }
  }

  // The card that stands in for the covered part of the screen: the picture,
  // darkened so the words read, with the lines centred over it.
  private static func drawCard(size: CGSize, lines: [String], picture: UIImage?) -> CIImage? {
    guard size.width >= 2, size.height >= 2 else { return nil }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let image = UIGraphicsImageRenderer(size: size, format: format).image { renderer in
      let whole = CGRect(origin: .zero, size: size)
      UIColor(red: 27 / 255, green: 26 / 255, blue: 23 / 255, alpha: 1).setFill()
      renderer.fill(whole)
      if let picture = picture, picture.size.width > 0, picture.size.height > 0 {
        // Fill the card, cropping what does not fit.
        let ratio = max(size.width / picture.size.width, size.height / picture.size.height)
        let drawn = CGSize(width: picture.size.width * ratio, height: picture.size.height * ratio)
        picture.draw(in: CGRect(x: (size.width - drawn.width) / 2, y: (size.height - drawn.height) / 2, width: drawn.width, height: drawn.height))
        UIColor(red: 27 / 255, green: 26 / 255, blue: 23 / 255, alpha: 0.72).setFill()
        renderer.fill(whole)
      }
      let shown = lines.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }.prefix(3)
      guard !shown.isEmpty else { return }
      let paragraph = NSMutableParagraphStyle()
      paragraph.alignment = .center
      paragraph.lineBreakMode = .byTruncatingTail
      let text = NSMutableAttributedString()
      for (index, line) in shown.enumerated() {
        let points = size.height * (index == 0 ? 0.105 : 0.07)
        text.append(NSAttributedString(string: (index == 0 ? "" : "\n") + line, attributes: [
          .font: index == 0 ? (UIFont(name: "Georgia-Bold", size: points) ?? UIFont.boldSystemFont(ofSize: points)) : UIFont.systemFont(ofSize: points),
          .foregroundColor: index == 0
            ? UIColor(red: 244 / 255, green: 241 / 255, blue: 232 / 255, alpha: 1)
            : UIColor(red: 201 / 255, green: 196 / 255, blue: 184 / 255, alpha: 1),
          .paragraphStyle: paragraph
        ]))
      }
      let inset = size.width * 0.07
      let room = CGSize(width: size.width - inset * 2, height: size.height * 0.84)
      let needed = text.boundingRect(with: room, options: [.usesLineFragmentOrigin, .usesFontLeading], context: nil)
      let height = min(room.height, ceil(needed.height))
      text.draw(with: CGRect(x: inset, y: (size.height - height) / 2, width: room.width, height: height),
                options: [.usesLineFragmentOrigin, .usesFontLeading, .truncatesLastVisibleLine], context: nil)
    }
    return CIImage(image: image)
  }
}
