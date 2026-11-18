Pod::Spec.new do |s|
  s.name = 'PhraseSelection'
  s.version = '1.0.0'
  s.summary = 'Direct phrase selection in Language Partner conversations'
  s.description = s.summary
  s.license = { :type => 'Private' }
  s.author = 'Language Partner'
  s.homepage = 'https://expo.dev'
  s.source = { :git => '' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
