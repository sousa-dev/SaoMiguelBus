// Home Page Body Widget
// Path: lib/layout/home.dart
import 'dart:async';
import 'dart:async';
import 'dart:convert';

import 'package:dots_indicator/dots_indicator.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:intl/intl.dart';
import 'dart:developer' as developer;

import 'package:saomiguelbus/layout/results.dart';
import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/instruction.dart';
import 'package:saomiguelbus/services/google_maps.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/services/smb_api.dart';
import 'package:saomiguelbus/utils/favourite_utility.dart';
import 'package:saomiguelbus/utils/preferences_utility.dart';
import 'package:saomiguelbus/utils/remove_diacritics.dart';
import 'package:saomiguelbus/utils/search_route.dart';
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
  List<dynamic> infoAlerts = [];
  int alertCount = 0;
  int trackingCount = trackBuses.length;
  int previousFavouritesCount = favourites.length;

  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _updateAllTrackBuses();
    _timer = Timer.periodic(
        const Duration(minutes: 1), (Timer t) => _updateAllTrackBuses());
  }

  @override
  void dispose() {
    // Cancel the timer when the widget is disposed
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (favourites.length != previousFavouritesCount) {
      setState(() {
        previousFavouritesCount = favourites.length;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (alertCount == 0) {
      fetchInfos().then((value) {
        setState(() {
          infoAlerts = jsonDecode(value!);
          alertCount = infoAlerts.length;
        });
      });
    }

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
                  showInfosDialog(context, infoAlerts);
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
                        if (origin.isEmpty || destination.isEmpty) {
                          Fluttertoast.showToast(
                            msg: AppLocalizations.of(context)!.fillFields,
                            toastLength: Toast.LENGTH_SHORT,
                            gravity: ToastGravity.BOTTOM,
                          );
                          return;
                        }

                        String key =
                            '$origin->$destination:${date.day}/${date.month}/${date.year}-${date.hour}h${date.minute}';
                        String languageCode =
                            AppLocalizations.of(context)!.languageCode;

                        fetchRoutes(
                                origin,
                                destination,
                                date,
                                _departureType,
                                autoComplete,
                                widget._routes,
                                context,
                                key,
                                widget._instructions,
                                languageCode)
                            .then((results) {
                          widget._routes = results['routes'];
                          widget._instructions = results['instructions'];
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => ResultsPageBody(
                                      gMaps: gMapsResultsCached[key],
                                      bdSmb: routesResultsCached[key],
                                      origin: autoComplete[origin]!,
                                      destination: autoComplete[destination]!,
                                      date: date,
                                      departureType: _departureType,
                                      autoComplete: autoComplete,
                                      routes: widget._routes,
                                      instructions: widget._instructions,
                                    )),
                          );
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
                  itemCount: trackingCount,
                  onPageChanged: (int index) {
                    setState(() {
                      currentIndex = index;
                    });
                  },
                  itemBuilder: (BuildContext context, int index) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8.0), // Add horizontal padding
                      child: Dismissible(
                        key: Key(trackBuses[index]
                            .toString()), // Unique key for Dismissible
                        direction: DismissDirection
                            .up, // Only allow swipe up to dismiss
                        confirmDismiss: (direction) async {
                          // Show a confirmation dialog
                          return await showDialog(
                            context: context,
                            builder: (BuildContext context) {
                              return AlertDialog(
                                title: const Text("Confirm"), //TODO: intl8
                                content: const Text(
                                    "Are you sure you wish to delete this item?"), //TODO: intl8
                                actions: <Widget>[
                                  TextButton(
                                    onPressed: () => Navigator.of(context)
                                        .pop(false), // Do not dismiss the item
                                    child: const Text("CANCEL"), //TODO: intl8
                                  ),
                                  TextButton(
                                    onPressed: () => Navigator.of(context)
                                        .pop(true), // Dismiss the item
                                    child: const Text("DELETE"), //TODO: intl8
                                  ),
                                ],
                              );
                            },
                          );
                        },
                        onDismissed: (direction) {
                          // Handle the dismissal
                          setState(() {
                            // Remove the dismissed item from the list
                            trackBuses.removeAt(index);
                            saveOnSharedPreferences(trackBuses, 'track_buses');
                            // Adjust trackingCount after removal
                            trackingCount = trackBuses.length;

                            if (currentIndex >= trackingCount) {
                              currentIndex = trackingCount -
                                  1; // Adjust currentIndex if it's now out of range
                            }

                            // You might also need to handle the case where trackingCount becomes 0
                            if (trackingCount == 0) {
                              currentIndex =
                                  0; // or any appropriate handling for empty state
                            }
                          });
                        },
                        background: ClipRRect(
                          borderRadius: BorderRadius.circular(
                              10), // Match the Card's border radius
                          child: Container(
                            color: Colors.red,
                            alignment: Alignment.bottomCenter,
                            child: const Icon(Icons.delete,
                                color: Colors.white, size: 40),
                          ),
                        ),
                        child: Card(
                          elevation: 5, // This gives the card an elevation
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(
                                10), // This gives the card rounded corners
                          ),
                          child: Center(
                            child: Text('Item ${trackBuses[index].toString()}'),
                          ),
                        ),
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
            itemCount: favouriteCount,
            itemBuilder: (BuildContext context, int index) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Dismissible(
                  key: Key(
                      '${favourites[index].origin}-${favourites[index].destination}'),
                  direction: DismissDirection.endToStart,
                  onDismissed: (direction) {
                    // Handle the deletion of the favourite
                    setState(() {
                      removeFavourite(favourites[index].origin,
                          favourites[index].destination);
                    });
                  },
                  background: Container(
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius:
                          BorderRadius.circular(10.0), // Add this line
                    ),
                    alignment: Alignment.centerRight,
                    child: const Padding(
                      padding: EdgeInsets.only(right: 20.0),
                      child: Icon(Icons.delete, color: Colors.white),
                    ),
                  ),
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        widget.onChangeOrigin(favourites[index].origin);
                        widget
                            .onChangeDestination(favourites[index].destination);
                        _scrollController.animateTo(
                          0.0,
                          duration: const Duration(milliseconds: 500),
                          curve: Curves.easeOut,
                        );
                      });
                    },
                    child: Card(
                      elevation: 5,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10.0),
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

  _updateAllTrackBuses() {
    for (var bus in trackBuses) {
      bus.updateStatus();
    }

    setState(() {
      trackingCount = trackBuses.length;
      if (currentIndex >= trackingCount) {
        currentIndex = trackingCount > 0 ? trackingCount - 1 : 0;
      }
    });

    developer.log("Bus Tracking Updated", name: 'update');
    developer.log(trackBuses.toString());
  }
}
