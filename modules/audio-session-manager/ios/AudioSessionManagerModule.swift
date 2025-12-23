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
  private var isSessionConfigured = false

  public func definition() -> ModuleDefinition {
    Name("AudioSessionManager")

    // Configure category ONCE (no activation)
    Function("configure") {
      do {
        try self.configureAudioSessionIfNeeded()
        return true
      } catch {
        print("Audio session configure failed: \(error)")
        return false
      }
    }

    // Start recording (activates session)
    AsyncFunction("startRecording") { () -> String? in
      do {
        try self.configureAudioSessionIfNeeded()
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

  func configureAudioSessionIfNeeded() throws {
    guard !isSessionConfigured else { return }

    let session = AVAudioSession.sharedInstance()

    try session.setCategory(
      .record,
      mode: .default,
      options: [
        .mixWithOthers,
        .allowBluetoothHFP
      ]
    )

    isSessionConfigured = true
  }


  func startRecordingInternal() throws {
    guard audioRecorder == nil else { return }

    let session = AVAudioSession.sharedInstance()
    try session.setActive(true)

    let documentsPath =
      FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]

    let timestamp = Int(Date().timeIntervalSince1970 * 1000)
    recordingURL =
      documentsPath.appendingPathComponent("recording_\(timestamp).m4a")

    let settings: [String: Any] = [
      AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
      AVSampleRateKey: 44_100,
      AVNumberOfChannelsKey: 1,
      AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
    ]

    audioRecorder = try AVAudioRecorder(url: recordingURL!, settings: settings)
    audioRecorder?.prepareToRecord()
    audioRecorder?.record()
  }

  func stopRecordingInternal() {
    audioRecorder?.stop()
    audioRecorder = nil

    do {
      try AVAudioSession.sharedInstance()
        .setActive(false, options: .notifyOthersOnDeactivation)
    } catch {
      print("Failed to deactivate audio session: \(error)")
    }
  }
}
