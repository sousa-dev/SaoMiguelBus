import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';

import 'dart:developer' as developer;
import 'package:saomiguelbus/l10n/l10n.dart';
import 'package:saomiguelbus/utils/show_dialog.dart';
import 'package:saomiguelbus/widgets/index.dart';
import 'package:saomiguelbus/layout/index.dart';
import 'package:saomiguelbus/utils/index.dart';
import 'package:saomiguelbus/models/globals.dart';

Future main() async {
  WidgetsFlutterBinding.ensureInitialized();

  //initialization();

  runApp(const MyApp());
}

Future<bool> initialization() async {
  await start(kDebugMode);

  FlutterNativeSplash.remove();
  return true;
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'São Miguel Bus',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: primaryColor),
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
      body: FutureBuilder<bool>(
        future: initialization(),
        builder: (BuildContext context, AsyncSnapshot<bool> snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const CircularProgressIndicator(); // Show a loading spinner while waiting
          } else {
            if (snapshot.error != null) {
              // If there's an error, return an error widget
              return const Center(child: Text('An error occurred!'));
            } else {
              // If the future completed without error, build your widget
              return widget.getBody();
            }
          }
        },
      ),
      bottomNavigationBar: getNavBar(widget.currentIndex, _updateBody),
    );
  }
}
