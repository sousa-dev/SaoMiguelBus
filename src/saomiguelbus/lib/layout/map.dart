// Map Page Body Widget
// Path: lib/layout/map.dart

import 'package:flutter/material.dart';

class MapPageBody extends StatefulWidget {
  const MapPageBody({Key? key}) : super(key: key);

  @override
  _MapPageBodyState createState() => _MapPageBodyState();
}

class _MapPageBodyState extends State<MapPageBody> {
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(
            'São Miguel Bus Map Page',
          ),
        ],
      ),
    );
  }
}