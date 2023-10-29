// Home Page Body Widget
// Path: lib/layout/home.dart
import 'package:dots_indicator/dots_indicator.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:intl/intl.dart';
import 'dart:developer' as developer;

import 'package:saomiguelbus/layout/results.dart';
import 'package:saomiguelbus/models/favourite.dart';
import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/instruction.dart';
import 'package:saomiguelbus/services/google_maps.dart';
import 'package:saomiguelbus/services/index.dart';
import 'package:saomiguelbus/models/route.dart' as my_route;
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/services/smb_api.dart';
import 'package:saomiguelbus/utils/remove_diacritics.dart';
import 'package:saomiguelbus/utils/show_dialog.dart';

class HomePageBody extends StatefulWidget {
  HomePageBody(
      {Key? key,
      required this.onChangeOrigin,
      required this.onChangeDestination})
      : super(key: key);

  final Function onChangeOrigin;
  final Function onChangeDestination;

  List _routes = [];
  Instruction _instructions = Instruction().initWarning("");

  @override
  _HomePageBodyState createState() => _HomePageBodyState();
}

class _HomePageBodyState extends State<HomePageBody> {
  Map<String, AutocompletePlace> autoComplete = {};
  var _departureType = "depart";
  DateTime date = DateTime.now().toUtc();
  final ScrollController _scrollController = ScrollController();
  int currentIndex = 0;
  int alertCount = 10;
  int trackingCount = 2;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: SingleChildScrollView(
        controller: _scrollController,
        child: Column(
          children: [
            _getTopSection(),
            _getSearchSection(),
            _getTrackSection(),
            _getFavouriteSection(),
          ],
        ),
      ),
    );
  }

  Widget _getTopSection() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        if (!internetConnection)
          IconButton(
            icon: const Icon(Icons.wifi_off),
            onPressed: () {
              showDialogWindow(
                  context,
                  AppLocalizations.of(context)!.noWifiTitle,
                  AppLocalizations.of(context)!.noWifiContent);
            },
          ),
        const Spacer(),
        if (alertCount > 0)
          Stack(
            children: <Widget>[
              IconButton(
                icon: const Icon(Icons.warning),
                onPressed: () {
                  // Handle the alert icon press here
                  showDialogWindow(context, "TODO", "Need to implement");
                },
              ),
              Positioned(
                right: 7,
                top: 5,
                child: Container(
                  padding: const EdgeInsets.all(1),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 12,
                    minHeight: 12,
                  ),
                  child: Text(
                    alertCount >= 10
                        ? '9+'
                        : alertCount
                            .toString(), // Replace with your dynamic value
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _getSearchSection() {
    var time = TimeOfDay.fromDateTime(date);

    return Container(
        decoration: BoxDecoration(
          color: primaryColor.withOpacity(0.2),
          borderRadius: BorderRadius.circular(
              10), // This gives the container rounded corners
        ),
        child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _getAutocompleteField('origin'),
                const SizedBox(height: 8.0),
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      final temp = origin;
                      origin = destination;
                      destination = temp;
                      widget.onChangeOrigin(origin);
                      widget.onChangeDestination(destination);
                    });
                  },
                  child: const Icon(Icons.swap_vert),
                ),
                const SizedBox(height: 8.0),
                _getAutocompleteField('destination'),
                Row(children: [
                  // Date picker button
                  ElevatedButton(
                    child: Text(DateFormat('yyyy-MM-dd').format(date)),
                    onPressed: () async {
                      final chosenDate = await showDatePicker(
                        context: context,
                        initialDate: date,
                        firstDate: DateTime.now(),
                        lastDate: DateTime(DateTime.now().year + 1),
                      );
                      if (chosenDate != null) {
                        setState(() {
                          date = DateTime(chosenDate.year, chosenDate.month,
                              chosenDate.day, date.hour, date.minute);
                        });
                      }
                    },
                  ),
                  const Spacer(), // This will push the following widgets to the right

                  // Departure type selector
                  DropdownButton<String>(
                    value: _departureType,
                    onChanged: (value) {
                      setState(() {
                        _departureType = value!;
                      });
                    },
                    items: [
                      DropdownMenuItem(
                        value: "depart",
                        child: Text(AppLocalizations.of(context)!.depart),
                      ),
                      DropdownMenuItem(
                        value: "arrive",
                        child: Text(AppLocalizations.of(context)!.arrive),
                      ),
                    ],
                  ),
                  ElevatedButton(
                    child: Text(
                        '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}'),
                    onPressed: () async {
                      final chosenTime = await pickTime(date);
                      if (chosenTime == null) return;
                      setState(() {
                        date = DateTime(date.year, date.month, date.day,
                            chosenTime.hour, chosenTime.minute);
                      });
                    },
                  )
                ]),
                SizedBox(
                    width: MediaQuery.of(context).size.width *
                        0.8, // This will make the container (and the button) take up the full width
                    child: ElevatedButton(
                      onPressed: () {
                        String key =
                            '$origin->$destination:${date.day}/${date.month}/${date.year}-${date.hour}h${date.minute}';

                        if (gMapsResultsCached.containsKey(key) &&
                            routesResultsCached.containsKey(key)) {
                          developer.log("Getting Results from cache...",
                              name: 'cache');
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => ResultsPageBody(
                                      gMaps: gMapsResultsCached[key],
                                      bdSmb: routesResultsCached[key],
                                      origin: autoComplete[origin]!,
                                      destination: autoComplete[destination]!,
                                    )),
                          );
                          return;
                        }

                        if (origin.isEmpty || destination.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                            content:
                                Text(AppLocalizations.of(context)!.fillFields),
                          ));
                          return;
                        }

                        setState(() {
                          if (!autoComplete.keys.contains(origin)) {
                            autoComplete[origin] = AutocompletePlace(
                              name: origin,
                              placeID: 'custom',
                              type: 'custom',
                            );
                          }
                          if (!autoComplete.keys.contains(destination)) {
                            autoComplete[destination] = AutocompletePlace(
                              name: destination,
                              placeID: 'custom',
                              type: 'custom',
                            );
                          }

                          getLatLngFromPlaceID(
                                  autoComplete[origin]!.placeID,
                                  autoComplete[destination]!.placeID,
                                  origin,
                                  destination)
                              .then((value) {
                            Location originLocation = value[0];
                            Location destinationLocation = value[1];

                            String originQuery = originLocation.toString();
                            String destinationQuery =
                                destinationLocation.toString();

                            if (originQuery == '0.0,0.0') {
                              if (autoComplete[origin]!.placeID == 'custom') {
                                originQuery = origin;
                                originLocation = getStop(origin).location;
                              } else {
                                originLocation =
                                    getStop(autoComplete[origin]!.name)
                                        .location;
                                originQuery = originLocation.toString();
                              }
                            }

                            if (destinationQuery == '0.0,0.0') {
                              if (autoComplete[destination]!.placeID ==
                                  'custom') {
                                destinationQuery = destination;
                                destinationLocation =
                                    getStop(destination).location;
                              } else {
                                destinationLocation =
                                    getStop(autoComplete[destination]!.name)
                                        .location;
                                destinationQuery =
                                    destinationLocation.toString();
                              }
                            }

                            getGoogleRoutes(originQuery, destinationQuery, date,
                                    AppLocalizations.of(context)!.languageCode,
                                    arrival_departure: _departureType)
                                .then((value) {
                              widget._instructions = value;
                              if (widget._instructions.runtimeType == String) {
                                ScaffoldMessenger.of(context)
                                    .showSnackBar(SnackBar(
                                  content:
                                      Text(widget._instructions.toString()),
                                ));
                                return;
                              }

                              Map gMapsResults = {
                                'origin': origin,
                                'destination': destination,
                                'routesNumber':
                                    widget._instructions.routes.length,
                                'instructions': widget._instructions,
                              };

                              List<Stop> originClosestStops =
                                  getClosestStops(originLocation);
                              List<Stop> destinationClosestStops =
                                  getClosestStops(destinationLocation);
                              widget._routes = [];
                              for (var originStop in originClosestStops) {
                                for (var destinationStop
                                    in destinationClosestStops) {
                                  developer.log(originStop.name);
                                  developer.log(destinationStop.name);
                                  developer.log(widget._routes.toString());
                                  widget._routes.addAll(findRoutes(
                                      originStop,
                                      destinationStop,
                                      _getDayOfWeekString(date.weekday)));
                                }
                              }

                              widget._routes = widget._routes.toSet().toList();

                              Map routesResults = {
                                'origin': originClosestStops
                                    .map((stop) => stop.name)
                                    .toList(),
                                'destination': destinationClosestStops
                                    .map((stop) => stop.name)
                                    .toList(),
                                'routesNumber': widget._routes.length,
                                'routes': widget._routes,
                              };

                              // Store the results in the global variables
                              developer.log("Storing Results in cache...",
                                  name: 'cache');
                              gMapsResultsCached[key] = gMapsResults;
                              routesResultsCached[key] = routesResults;

                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (context) => ResultsPageBody(
                                          gMaps: gMapsResults,
                                          bdSmb: routesResults,
                                          origin: autoComplete[origin]!,
                                          destination:
                                              autoComplete[destination]!,
                                        )),
                              );
                            });
                          });
                        });
                      },
                      child: Text(AppLocalizations.of(context)!.search),
                    )),
              ],
            )));
  }

  Widget _getTrackSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Bus Tracking',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const Text(
          'All scheduling is estimated',
          style: TextStyle(fontSize: 16, color: Colors.grey),
        ),
        const SizedBox(height: 10),
        Column(
          children: [
            if (trackingCount != 0)
              SizedBox(
                height: 100, // Adjust this value as needed
                child: PageView.builder(
                  controller: PageController(viewportFraction: 1),
                  itemCount:
                      trackingCount, // Replace with your dynamic item count
                  onPageChanged: (int index) {
                    setState(() {
                      currentIndex =
                          index; // Update the current page index when the page changes
                    });
                  },
                  itemBuilder: (BuildContext context, int index) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8.0), // Add horizontal padding
                      child: Card(
                        elevation: 5, // This gives the card an elevation
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(
                              10), // This gives the card rounded corners
                        ),
                        child: Center(child: Text('Item $index')),
                      ),
                    );
                  },
                ),
              ),
            const SizedBox(height: 10),
            if (trackingCount > 1)
              Container(
                decoration: BoxDecoration(
                  color: const Color.fromARGB(145, 114, 181, 123),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withOpacity(0.5),
                      spreadRadius: 1,
                      blurRadius: 7,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(5.0),
                  child: DotsIndicator(
                    dotsCount: trackingCount > 10 ? 10 : trackingCount,
                    position: currentIndex >= 10
                        ? 9.toDouble()
                        : currentIndex.toDouble(),
                    decorator: const DotsDecorator(
                      activeColor: Color(0xFF218732),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _getFavouriteSection() {
    int favouriteCount = favourites.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 10),
        const Text(
          'Favourite Routes',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 200, // Adjust this value as needed
          child: ListView.builder(
            itemCount: favouriteCount, // Replace with your dynamic item count
            itemBuilder: (BuildContext context, int index) {
              return Padding(
                padding: const EdgeInsets.symmetric(
                    vertical: 8.0), // Add vertical padding
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      widget.onChangeOrigin(favourites[index].origin);
                      widget.onChangeDestination(favourites[index].destination);
                      _scrollController.animateTo(
                        0.0,
                        duration: const Duration(milliseconds: 500),
                        curve: Curves.easeOut,
                      );
                    });
                  },
                  child: Card(
                    elevation: 5, // This gives the card an elevation
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(
                          10), // This gives the card rounded corners
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Text(
                              favourites[index]
                                  .origin, // Replace with your origin value
                              softWrap:
                                  true, // This will make the text continue to another line if it's too long
                            ),
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(
                                horizontal: 8.0), // Add horizontal padding
                            child: Icon(Icons.arrow_forward),
                          ),
                          Flexible(
                            child: Text(
                              favourites[index]
                                  .destination, // Replace with your destination value
                              softWrap:
                                  true, // This will make the text continue to another line if it's too long
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _getAutocompleteField(String targetLabel) {
    return Autocomplete<String>(
      optionsBuilder: (TextEditingValue textEditingValue) {
        return onChangeText(textEditingValue.text);
      },
      fieldViewBuilder:
          (context, textEditingController, focusNode, onFieldSubmitted) {
        textEditingController.text =
            targetLabel == 'origin' ? origin : destination;
        return TextFormField(
          controller: textEditingController,
          focusNode: focusNode,
          onTapOutside: (event) => focusNode.unfocus(),
          decoration: InputDecoration(
            labelText: targetLabel == 'origin'
                ? AppLocalizations.of(context)!.origin
                : AppLocalizations.of(context)!.destination,
            border: const OutlineInputBorder(),
            suffixIcon: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              transitionBuilder: (child, animation) {
                return ScaleTransition(
                  scale: animation,
                  child: child,
                );
              },
              child: (targetLabel == 'origin' ? origin : destination).isNotEmpty
                  ? IconButton(
                      key: targetLabel == 'origin'
                          ? const ValueKey('originClearIcon')
                          : const ValueKey('destinationClearIcon'),
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        textEditingController.clear();
                        setState(() {
                          if (targetLabel == 'origin') {
                            origin = '';
                          } else {
                            destination = '';
                          }
                        });
                        focusNode.unfocus();
                      },
                    )
                  : null,
            ),
          ),
          onChanged: (value) {
            setState(() {
              if (targetLabel == 'origin') {
                origin = value;
              } else {
                destination = value;
              }
            });
          },
          onFieldSubmitted: (value) {
            setState(() {
              if (targetLabel == 'origin') {
                origin = value;
              } else {
                destination = value;
              }
            });
            onFieldSubmitted();
            focusNode.unfocus();
          },
        );
      },
      optionsViewBuilder: (BuildContext context,
          AutocompleteOnSelected<String> onSelected, Iterable<String> options) {
        return Align(
          alignment: Alignment.topLeft,
          child: Material(
            elevation: 4.0,
            child: SizedBox(
              height: 200.0,
              child: ListView.builder(
                padding: const EdgeInsets.all(8.0),
                itemCount: options.length,
                itemBuilder: (BuildContext context, int index) {
                  final option = options.elementAt(index);
                  AutocompletePlace? autocompletePlace =
                      autoComplete.containsKey(option)
                          ? autoComplete[option]
                          : null;
                  return ListTile(
                    title: Text(autocompletePlace != null
                        ? autocompletePlace.name
                        : option),
                    leading: autocompletePlace != null
                        ? autocompletePlace.icon
                        : const Icon(Icons.location_on),
                    onTap: () {
                      onSelected(option);
                    },
                  );
                },
              ),
            ),
          ),
        );
      },
      onSelected: (String selection) => targetLabel == 'origin'
          ? widget.onChangeOrigin(selection)
          : widget.onChangeDestination(selection),
    );
  }

  Future<Iterable<String>> onChangeText(String text) async {
    if (internetConnection) {
      return placesAutocomplete(text, context).then((value) {
        List<String> placesSuggestions = [];
        placesSuggestions = value[0];
        autoComplete.addAll(value[1]);
        if (placesSuggestions.isNotEmpty) {
          return placesSuggestions;
        }
        return defaultSuggestions(text);
      });
    }
    return defaultSuggestions(text);
  }

  Iterable<String> defaultSuggestions(String text) {
    List<String> stopMatches = <String>[];
    stopMatches.addAll(allStops.keys.cast<String>());

    for (var stop in allStops.keys) {
      autoComplete[stop] = AutocompletePlace(
        name: stop,
        placeID: 'na',
        type: 'bus_station',
      );
    }

    stopMatches.retainWhere((stop) {
      return removeDiacritics(stop.toLowerCase())
          .contains(removeDiacritics(text.toLowerCase()));
    });
    return stopMatches;
  }

  pickDate(DateTime date) => showDatePicker(
        context: context,
        initialDate: date,
        firstDate: date,
        lastDate: DateTime(date.year + 1),
      );

  pickTime(DateTime date) => showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(date),
      );

  TypeOfDay _getDayOfWeekString(int weekday) {
    developer.log(weekday.toString(), name: 'weekday');
    switch (weekday) {
      case 6:
        return TypeOfDay.saturday;
      case 7:
        return TypeOfDay.sunday;
      default:
        return TypeOfDay.weekday;
    }
  }
}
