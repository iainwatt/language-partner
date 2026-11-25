Pod::Spec.new do |s|
  s.name = 'ScreenRecording'
  s.version = '1.0.0'
  s.summary = 'Records the Language Partner screen and the microphone to a clip, with part of the picture covered'
  s.description = s.summary
  s.license = { :type => 'Private' }
  s.author = 'Language Partner'
  s.homepage = 'https://expo.dev'
  s.source = { :git => '' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ReplayKit', 'AVFoundation', 'CoreImage'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
