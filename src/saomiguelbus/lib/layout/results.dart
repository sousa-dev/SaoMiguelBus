// Results Page Body Widget
// Path: lib/layout/results.dart

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import 'package:saomiguelbus/models/card_route.dart';
import 'package:saomiguelbus/models/instruction.dart';

class ResultsPageBody extends StatefulWidget {
  const ResultsPageBody(
      {Key? key,
      required this.origin,
      required this.destination,
      required this.routesNumber,
      this.routes,
      this.instructions})
      : super(key: key);

  final String origin;
  final String destination;
  final int routesNumber;
  final List? routes;
  final Instruction? instructions;

  @override
  _ResultsPageBodyState createState() => _ResultsPageBodyState();
}

class _ResultsPageBodyState extends State<ResultsPageBody> {
  @override
  Widget build(BuildContext context) {
    if (widget.routesNumber == 0) {
      return Material(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              AppLocalizations.of(context)!.noRoutesFound,
            ),
          ],
        ),
      );
    }

    if (widget.instructions != null) {
      return Material(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Expanded(
              child: SingleChildScrollView(
                child: ListView.builder(
                  physics: const ScrollPhysics(parent: null),
                  shrinkWrap: true,
                  itemBuilder: (BuildContext context, int index) {
                    return ExpansionTile(
                      iconColor: Colors.blue,
                      textColor: Colors.black,
                      title: Text("Text"),
                      children: [
                        Text(
                          "Hello",
                        ),
                      ],
                    );
                  },
                  itemCount: widget.routesNumber,
                ),
              ),
            ),
          ],
        ),
      );
    }
    List _routes =
        _routeToCard(widget.routes ?? [], widget.origin, widget.destination);
    return Material(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: ListView.builder(
                physics: const ScrollPhysics(parent: null),
                shrinkWrap: true,
                itemBuilder: (BuildContext context, int index) {
                  return ExpansionTile(
                    iconColor: Colors.blue,
                    textColor: Colors.black,
                    title: ListTile(
                      title: _routes[index].title,
                      subtitle: _routes[index].subtitle,
                      leading: _routes[index].leading,
                    ),
                    children: [
                      Text(
                        _routes[index].arrivalStop.toString(),
                      ),
                    ],
                  );
                },
                itemCount: widget.routesNumber,
              ),
            ),
          ),
        ],
      ),
    );
  }

  List _routeToCard(List routes, String origin, String destination) {
    List cardRoutes = [];
    for (var route in routes) {
      cardRoutes.add(CardRoute(route, origin, destination, context));
    }
    return cardRoutes;
  }
}
