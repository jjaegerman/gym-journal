//
//  AudioSessionManagerModule.swift
//  gymjournal
//
//  Native audio recording that does NOT interrupt background audio
//

import Foundation
import AVFoundation
import ExpoModulesCore

public final class AudioSessionManagerModule: Module {
  private var audioRecorder: AVAudioRecorder?
  private var recordingURL: URL?

  // Store audio session reference and configure once at initialization
  private let audioSession = AVAudioSession.sharedInstance()

  // Pre-computed values to avoid recreation on every recording
  private lazy var documentsPath: URL = {
    FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
  }()

  private let recordingSettings: [String: Any] = [
    AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
    AVSampleRateKey: 44_100,
    AVNumberOfChannelsKey: 1,
    AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
  ]

  public func definition() -> ModuleDefinition {
    Name("AudioSessionManager")

    // Configure audio session category once at module initialization
    OnCreate {
      do {
        try self.audioSession.setCategory(
          .record,
          mode: .default,
          options: [.mixWithOthers, .allowBluetoothHFP]
        )
        print("✅ Audio session configured")
      } catch {
        print("❌ Failed to configure audio session: \(error)")
      }
    }

    // Start recording (activates session)
    AsyncFunction("startRecording") { () -> String? in
      do {
        try self.startRecordingInternal()
        return self.recordingURL?.absoluteString
      } catch {
        print("Failed to start recording: \(error)")
        return nil
      }
    }

    // Stop recording (NO deactivation)
    AsyncFunction("stopRecording") { () -> String? in
      self.stopRecordingInternal()
      return self.recordingURL?.absoluteString
    }

    Function("isRecording") {
      self.audioRecorder?.isRecording ?? false
    }

    Function("getRecordingDuration") {
      self.audioRecorder?.currentTime ?? 0
    }
  }
}

// MARK: - Internal implementation

private extension AudioSessionManagerModule {

  func startRecordingInternal() throws {
    guard audioRecorder == nil else { return }

    // Just activate the pre-configured session
    try audioSession.setActive(true)

    // Use pre-computed documentsPath and recordingSettings
    let timestamp = Int(Date().timeIntervalSince1970 * 1000)
    recordingURL = documentsPath.appendingPathComponent("recording_\(timestamp).m4a")

    // Create recorder and start immediately (record() calls prepareToRecord automatically)
    audioRecorder = try AVAudioRecorder(url: recordingURL!, settings: recordingSettings)
    audioRecorder?.record()
  }

  func stopRecordingInternal() {
    audioRecorder?.stop()
    audioRecorder = nil

    do {
      try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
    } catch {
      print("Failed to deactivate audio session: \(error)")
    }
  }
}
