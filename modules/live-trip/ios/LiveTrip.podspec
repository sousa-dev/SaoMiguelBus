Pod::Spec.new do |s|
  s.name           = 'LiveTrip'
  s.version        = '0.1.0'
  s.summary        = 'ActivityKit bridge for the Uber-style live trip bar.'
  s.description    = 'Local Expo module. See modules/live-trip/README.md.'
  s.license        = 'UNLICENSED'
  s.author         = 'Sousa Dev'
  s.homepage       = 'https://saomiguelbus.com'
  s.platform       = :ios, '16.4'
  s.swift_version  = '5.0'
  s.source         = { path: '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '*.{h,m,swift}'
end
