import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';

import 'package:saomiguelbus/l10n/l10n.dart';
import 'package:saomiguelbus/widgets/index.dart';
import 'package:saomiguelbus/layout/index.dart';
import 'package:saomiguelbus/utils/index.dart';

Future main() async {
  WidgetsFlutterBinding.ensureInitialized();

  initialization();

  runApp(const MyApp());
}

initialization() {
  start(kDebugMode);

  FlutterNativeSplash.remove();
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'São Miguel Bus',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF218732)),
        useMaterial3: true,
      ),
      supportedLocales: L10n.all,
      localeResolutionCallback: L10n.localeFallback,
      localizationsDelegates: L10n.localizationsDelegates,
      home: MyHomePage(title: 'São Miguel Bus'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  MyHomePage({super.key, required this.title});

  final List<StatefulWidget> _pages = [
    HomePageBody(
      key: UniqueKey(),
      onChangeOrigin: onChangeOriginHome,
      onChangeDestination: onChangeDestinationHome,
    ),
    const FindPageBody(),
    MapPageBody(
      key: UniqueKey(),
      onChangeOrigin: onChangeOriginHome,
      onChangeDestination: onChangeDestinationHome,
    ),
    const InfoPageBody(),
  ];
  final String title;
  int _currentIndex = 0;

  void onNavBarItemSelected(int index) {
    _currentIndex = index;
  }

  Widget getBody() => _pages[_currentIndex];

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  void _updateBody(int index) {
    setState(() {
      widget.onNavBarItemSelected(index);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: widget.getBody(),
      bottomNavigationBar: NavBar(
          key: UniqueKey(),
          currentIndex: widget._currentIndex,
          onItemSelected: _updateBody),
    );
  }
}
