// Find Page Body Widget
// Path: lib/layout/find.dart

import 'package:flutter/material.dart';

class FindPageBody extends StatefulWidget {
  const FindPageBody({Key? key}) : super(key: key);

  @override
  _FindPageBodyState createState() => _FindPageBodyState();
}

class _FindPageBodyState extends State<FindPageBody> {
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(
            'São Miguel Bus Find Page',
          ),
        ],
      ),
    );
  }
}