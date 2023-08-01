// Info Page Body Widget
// Path: lib/layout/info.dart

import 'package:flutter/material.dart';

class InfoPageBody extends StatefulWidget {
  const InfoPageBody({Key? key}) : super(key: key);

  @override
  _InfoPageBodyState createState() => _InfoPageBodyState();
}

class _InfoPageBodyState extends State<InfoPageBody> {
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(
            'São Miguel Bus Info Page',
          ),
        ],
      ),
    );
  }
}