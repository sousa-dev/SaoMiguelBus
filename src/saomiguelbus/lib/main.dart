import 'package:flutter/material.dart';
import './widgets/navBar.dart';

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
        colorScheme: ColorScheme.fromSeed(seedColor: Color(0xFF218732)),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'São Miguel Bus'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const <Widget>[
            Text(
              'São Miguel Bus',
            ),
          ],
        ),
      ),
      // Add a NavBar
      bottomNavigationBar: NavBar(key: UniqueKey(), selectedIndex: 4),
    );
  }
}
