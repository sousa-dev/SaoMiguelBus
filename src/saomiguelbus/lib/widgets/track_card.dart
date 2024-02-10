import 'package:flutter/material.dart';
import 'dart:math' as math;

import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/models/track_bus.dart';

class TrackCard extends StatefulWidget {
  final int index; // Assuming you're passing the index or any other data needed

  TrackCard({Key? key, required this.index}) : super(key: key);

  @override
  _TrackCardState createState() => _TrackCardState();
}

class _TrackCardState extends State<TrackCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Color circleColor;

  @override
  void initState() {
    super.initState();
    circleColor = getStatusColor(trackBuses[widget.index].status);
    _animationController = AnimationController(
      duration: const Duration(seconds: 1),
      vsync: this,
    );

    // Start the animation only if the color is not grey
    if (circleColor != Colors.grey.withOpacity(0.5)) {
      _animationController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(TrackCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Update the color and animation when the widget updates
    final newColor = getStatusColor(trackBuses[widget.index].status);
    if (circleColor != newColor) {
      circleColor = newColor;
      if (circleColor == Colors.grey.withOpacity(0.5)) {
        _animationController.stop();
      } else {
        _animationController.repeat(reverse: true);
      }
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20.0),
      ),
      child: Padding(
        padding: const EdgeInsets.all(2.0),
        child: Stack(
          children: <Widget>[
            Positioned(
              child: AnimatedBuilder(
                animation: _animationController,
                builder: (context, child) {
                  return CustomPaint(
                    painter: PulsatingCirclePainter(
                      _animationController.isAnimating
                          ? _animationController.value
                          : 0,
                      circleColor,
                    ),
                    child: const SizedBox(width: 24, height: 24),
                  );
                },
              ),
            ),
            // if (trackBuses[widget.index].currentStop != null)
            Padding(
              padding: const EdgeInsets.only(right: 10.0),
              child: Align(
                alignment: Alignment.topRight,
                child: Text(
                  'Currently in ${trackBuses[widget.index].currentStop?.name}',
                  style: const TextStyle(color: Colors.grey),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(
                  left: 15.0, top: 15.0), // Adjust the padding as needed
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      const Icon(Icons.directions_bus,
                          size: 50, color: Colors.black),
                      const SizedBox(
                          width: 5), // Space between the icon and the text
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(
                              'Bus will arrive in ${trackBuses[widget.index].catchStop.name} at ${trackBuses[widget.index].catchTime} ${trackBuses[widget.index].searchDay.day}/${trackBuses[widget.index].searchDay.month}/${trackBuses[widget.index].searchDay.year}',
                              // Replace with your actual data
                              style: const TextStyle(color: Colors.black),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: <Widget>[
                      Align(
                        alignment: Alignment.center,
                        child: Text(
                          '${trackBuses[widget.index].timeToCatch?.inMinutes} min to catch the bus',
                          style: const TextStyle(color: Colors.black),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color getStatusColor(Status status) {
    switch (status) {
      case Status.running:
        return Colors.green.withOpacity(0.5);
      case Status.waiting:
        return Colors.orange.withOpacity(0.5);
      case Status.delayed:
        return Colors.red.withOpacity(0.5);
      default:
        return Colors.grey.withOpacity(0.5);
    }
  }
}

class PulsatingCirclePainter extends CustomPainter {
  final double animationValue;
  final Color color;

  PulsatingCirclePainter(this.animationValue, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    var paint = Paint()..color = color;

    final center = Offset(size.width / 2, size.height / 2);
    final maxRadius =
        size.width / 4; // Use a smaller radius for the static circles

    // Calculate opacity and radius based on the animation value,
    // but when the color is grey, use a static value for opacity.
    for (int i = 0; i < 3; i++) {
      final currentRadius = maxRadius * ((i + 1) / 3);
      double currentOpacity;
      if (color == Colors.grey.withOpacity(0.5)) {
        // If the color is grey, draw static circles with fixed opacity.
        currentOpacity = (1 - (i + 1) / 3).clamp(0.0, 1.0);
      } else {
        // If the color is not grey, apply the animation value to the opacity.
        currentOpacity = (1 - animationValue * (i + 1) / 3).clamp(0.0, 1.0);
      }
      paint.color = paint.color.withOpacity(currentOpacity);
      canvas.drawCircle(center, currentRadius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
