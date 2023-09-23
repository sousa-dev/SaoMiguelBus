import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';

import 'dart:developer' as developer;
import 'package:saomiguelbus/l10n/l10n.dart';
import 'package:saomiguelbus/widgets/index.dart';
import 'package:saomiguelbus/layout/index.dart';
import 'package:saomiguelbus/utils/index.dart';
import 'package:saomiguelbus/models/globals.dart';

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
  MyHomePage({super.key, required this.title, this.currentIndex = 0});

  final String title;
  int currentIndex;

  void onNavBarItemSelected(int index) {
    currentIndex = index;
  }

  Widget getBody() => pages[currentIndex];

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
      appBar: getTopBar(title: widget.title),
      body: widget.getBody(),
      bottomNavigationBar: getNavBar(widget.currentIndex, _updateBody),
    );
  }
}
