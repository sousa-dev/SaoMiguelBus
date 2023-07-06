import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

import './widgets/index.dart';
import './layout/index.dart';
import './utils/index.dart';

void main() {
  start(kDebugMode);
  runApp(MyApp());
}
// void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF218732)),
        useMaterial3: true,
      ),
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
    const MapPageBody(),
    const InfoPageBody(),
  ];
  final String title;
  int _currentIndex = 0;

  void onNavBarItemSelected(int index) {
    _currentIndex = index;
  }

  Widget getBody() => _pages[_currentIndex]!;

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
