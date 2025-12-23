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
          mode: .videoRecording,
          options: [.mixWithOthers, .defaultToSpeaker, .allowBluetoothA2DP]
        )

        // Activate with notifyOthersOnDeactivation so Spotify resumes when we stop
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

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
        // Deactivate with notifyOthersOnDeactivation so other apps (Spotify) resume
        try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
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

    // Register the module in ExpoModulesProvider.swift
    const expoModulesProviderPath = path.join(
      projectRoot,
      "Pods/Target Support Files",
      `Pods-${projectName}`,
      "ExpoModulesProvider.swift"
    );

    if (fs.existsSync(expoModulesProviderPath)) {
      let providerContent = fs.readFileSync(expoModulesProviderPath, "utf-8");

      // Add import if not already present
      if (!providerContent.includes("import AudioSessionManager")) {
        providerContent = providerContent.replace(
          /(import ExpoModulesCore)/,
          "$1\nimport gymjournal"
        );
      }

      // Add module to the array if not already present
      if (!providerContent.includes("AudioSessionManagerModule.self")) {
        providerContent = providerContent.replace(
          /(return \[[\s\S]*?)(BurntModule\.self,)/,
          "$1$2\n      AudioSessionManagerModule.self,"
        );
      }

      fs.writeFileSync(expoModulesProviderPath, providerContent);
      console.log("✅ Registered AudioSessionManagerModule in ExpoModulesProvider");
    } else {
      console.warn("⚠️ Could not find ExpoModulesProvider.swift");
    }

    return config;
  });
}

module.exports = withAudioSessionManager;
