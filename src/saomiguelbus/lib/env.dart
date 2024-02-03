import 'package:envied/envied.dart';

part 'env.g.dart';

@Envied(path: '.env', obfuscate: true)
abstract class Env {
  @EnviedField(varName: 'googleMapsApiKey')
  static final String googleMapsApiKey = _Env.googleMapsApiKey;
}
