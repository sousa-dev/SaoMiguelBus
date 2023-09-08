// Results Page Body Widget
// Path: lib/layout/results.dart

import 'package:flutter/material.dart';

class ResultsPageBody extends StatefulWidget {
  const ResultsPageBody({Key? key}) : super(key: key);

  @override
  _ResultsPageBodyState createState() => _ResultsPageBodyState();
}

class _ResultsPageBodyState extends State<ResultsPageBody> {
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(
            'São Miguel Bus Results Page',
          ),
        ],
      ),
    );
  }
}
