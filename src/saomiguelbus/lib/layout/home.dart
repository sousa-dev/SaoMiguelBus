// Home Page Body Widget
// Path: lib/layout/home.dart

import 'package:flutter/material.dart';

class HomePageBody extends StatefulWidget {
  const HomePageBody({Key? key, required this.onChangeOrigin, required this.onChangeDestination})
      : super(key: key);

  final Function onChangeOrigin;
  final Function onChangeDestination;

  @override
  _HomePageBodyState createState() => _HomePageBodyState();
}

class _HomePageBodyState extends State<HomePageBody> {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          TextField(
            decoration: const InputDecoration(
              labelText: 'Origin',
              border: OutlineInputBorder(),
            ),
            onChanged: (value) {
              widget.onChangeOrigin(value);
            },
            // (value) {
            //   setState(() {
            //     _origin = value;
            //   });
            // },
          ),
          const SizedBox(height: 16.0),
          TextField(
            decoration: const InputDecoration(
              labelText: 'Destination',
              border: OutlineInputBorder(),
            ),
            onChanged: (value) {
              widget.onChangeDestination(value);
            },
          ),
        ],
      ),
    );
  }
}
