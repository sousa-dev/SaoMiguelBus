// Results Page Body Widget
// Path: lib/layout/results.dart

import 'package:flutter/material.dart';
import 'package:saomiguelbus/models/card_route.dart';

class ResultsPageBody extends StatefulWidget {
  const ResultsPageBody(
      {Key? key, required this.routesNumber, required this.routes})
      : super(key: key);

  final int routesNumber;
  final List routes;

  @override
  _ResultsPageBodyState createState() => _ResultsPageBodyState();
}

class _ResultsPageBodyState extends State<ResultsPageBody> {
  @override
  Widget build(BuildContext context) {
    print("Routes: " + widget.routes.toString());
    List _routes = _routeToCard(widget.routes);
    print(_routes);
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
          Expanded(
            child: SingleChildScrollView(
              child: ListView.builder(
                physics: const ScrollPhysics(parent: null),
                shrinkWrap: true,
                itemBuilder: (BuildContext context, int index) {
                  return Container(
                    color: Colors.blue,
                    child: ListTile(
                      trailing: _routes[index].trailing,
                      title: _routes[index].title,
                      subtitle: _routes[index].subtitle,
                      leading: _routes[index].leading,
                    ),
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

  static List _routeToCard(List routes) {
    List cardRoutes = [];
    for (var route in routes) {
      String origin = route.stops.keys.first.name;
      String destination = route.stops.keys.last.name;
      cardRoutes.add(CardRoute(
        trailing: const Icon(Icons.arrow_forward_ios),
        title: Text(route.id),
        subtitle: Text(origin + ' - ' + destination),
        leading: const Icon(Icons.directions_bus),
      ));
    }
    return cardRoutes;
  }
}
