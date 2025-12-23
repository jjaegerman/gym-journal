require 'json'

package = JSON.parse(File.read(File.join(__dir__, '../package.json')))

Pod::Spec.new do |s|
  s.name           = 'AudioSessionManager'
  s.version        = package['version']
  s.summary        = 'Expo module for iOS audio session management'
  s.description    = 'Configures iOS AVAudioSession to allow recording without interrupting background music'
  s.license        = 'MIT'
  s.authors        = 'Gym Journal'
  s.homepage       = 'https://github.com/yourname/audio-session-manager'
  s.platform       = :ios, '13.4'
  s.swift_version  = '5.4'
  s.source         = { git: '', tag: "v#{s.version}" }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
