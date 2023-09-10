// Results Page Body Widget
// Path: lib/layout/results.dart

import 'package:flutter/material.dart';

class ResultsPageBody extends StatefulWidget {
  const ResultsPageBody({Key? key, required this.routesNumber})
      : super(key: key);

  final int routesNumber;

  @override
  _ResultsPageBodyState createState() => _ResultsPageBodyState();
}

class _ResultsPageBodyState extends State<ResultsPageBody> {
  @override
  Widget build(BuildContext context) {
    //TODO: Change the text to internationalization
    if (widget.routesNumber == 0) {
      return const Material(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              'São Miguel Bus Results Page',
            ),
            Text(
              'No routes found',
            ),
          ],
        ),
      );
    }

    return Material(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'São Miguel Bus Results Page',
          ),
          ListView.builder(
            physics: const ScrollPhysics(parent: null),
            shrinkWrap: true,
            itemBuilder: (BuildContext context, int index) {
              return Container(
                color: Colors.blue,
                child: ListTile(
                  trailing: Icon(Icons.arrow_forward_ios),
                  title: Text('Teste'),
                  subtitle: Text('Teste'),
                  leading: Icon(Icons.directions_bus),
                ),
              );
            },
            itemCount: widget.routesNumber,
          ),
        ],
      ),
    );
  }
}
