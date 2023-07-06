import 'package:flutter/material.dart';
import './widgets/navBar.dart';
import './layout/home.dart';
import './layout/find.dart';
import './layout/map.dart';
import './layout/info.dart';

void main() {
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

  final Map<int, StatefulWidget> _pages = {
    0: const HomePageBody(),
    1: const FindPageBody(),
    2: const MapPageBody(),
    3: const InfoPageBody(),
  };
  final String title;
  int _currentIndex = 0;
  Widget body = const HomePageBody();

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
