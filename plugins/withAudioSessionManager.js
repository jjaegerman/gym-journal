const {
  withXcodeProject,
  IOSConfig,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin to add AudioSessionManagerModule.swift to iOS project
 */
function withAudioSessionManager(config) {
  return withXcodeProject(config, async (config) => {
    const swiftCode = `//
//  AudioSessionManagerModule.swift
//  gymjournal
//
//  Configure iOS AVAudioSession to allow recording without interrupting background music
//

import Foundation
import AVFoundation
import ExpoModulesCore

public class AudioSessionManagerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioSessionManager")

    // Configure audio session for recording that doesn't interrupt background music
    Function("configureForRecording") {
      do {
        let audioSession = AVAudioSession.sharedInstance()

        // Use .playAndRecord category with .mixWithOthers and .defaultToSpeaker
        // This is how Camera app allows recording without stopping Spotify
        try audioSession.setCategory(
          .playAndRecord,
          mode: .default,
          options: [.mixWithOthers, .defaultToSpeaker, .allowBluetooth]
        )

        try audioSession.setActive(true, options: [])

        return true
      } catch {
        print("Failed to configure audio session: \\(error)")
        return false
      }
    }

    // Reset to default configuration
    Function("resetAudioSession") {
      do {
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setActive(false, options: [])
        return true
      } catch {
        print("Failed to reset audio session: \\(error)")
        return false
      }
    }
  }
}
`;

    const projectRoot = config.modRequest.platformProjectRoot;
    const projectName = config.modRequest.projectName || "gymjournal";

    // Write the Swift file
    const swiftFilePath = path.join(projectRoot, projectName, "AudioSessionManagerModule.swift");
    fs.writeFileSync(swiftFilePath, swiftCode);

    // Add file to Xcode project
    const project = config.modResults;
    const group = project.getFirstProject().firstProject.mainGroup;

    // Find the app group (gymjournal folder in Xcode)
    const appGroupKey = project.findPBXGroupKey({ name: projectName });

    if (appGroupKey) {
      // Add the file to the group
      const file = project.addSourceFile(
        `${projectName}/AudioSessionManagerModule.swift`,
        { target: project.getFirstTarget().uuid },
        appGroupKey
      );

      console.log("✅ Added AudioSessionManagerModule.swift to Xcode project");
    } else {
      console.warn("⚠️ Could not find app group, Swift file created but not added to Xcode project");
    }

    return config;
  });
}

module.exports = withAudioSessionManager;
