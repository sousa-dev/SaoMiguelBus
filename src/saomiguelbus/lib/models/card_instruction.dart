import 'package:flutter/material.dart';
import 'package:saomiguelbus/models/instruction.dart';

class CardInstruction {
  Card getInstructionWidget(
      StepRoute instructions, String origin, String destination) {
    String departureTime = instructions.legs[0].departure;
    String arrivalTime = instructions.legs[0].arrival;
    String time = instructions.legs[0].duration;
    String duration = _getDurationText(time);

    //TODO: Get how many meters to walk

    //TODO: Get how many buses to take

    //TODO: Get Leave the bus at X step
    return Card(
      elevation: 2.0,
      child: ExpansionTile(
        iconColor: const Color(0xFF218732),
        textColor: Colors.black,
        title: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    origin,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8.0),
                  Text(
                    departureTime,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF218732),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_right_alt,
              size: 40.0,
              color: Color(0xFF218732),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    destination,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    textAlign: TextAlign.right,
                  ),
                  const SizedBox(height: 8.0),
                  Text(
                    arrivalTime,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF218732),
                    ),
                    textAlign: TextAlign.right,
                  ),
                  const SizedBox(height: 8.0),
                  Text(
                    duration,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF218732),
                    ),
                    textAlign: TextAlign.right,
                  ),
                ],
              ),
            ),
          ],
        ),
        children: [
          ListView.builder(
            physics: const ScrollPhysics(parent: null),
            shrinkWrap: true,
            itemCount: instructions.legs[0].steps.length,
            itemBuilder: (BuildContext context, int index) {
              return ListTile(
                leading: _getLeadingIcon(
                    instructions.legs[0].steps[index].travelMode),
                title: Text(instructions.legs[0].steps[index].instructions),
              );
            },
          ),
        ],
      ),
    );
  }

  _getLeadingIcon(String travelMode) {
    switch (travelMode) {
      case 'WALKING':
        return const Icon(Icons.directions_walk);
      case 'TRANSIT':
        return const Icon(Icons.directions_bus);
      default:
        return const Icon(Icons.info_outline_rounded);
    }
  }

  String _getDurationText(String time) {
    // Get only the numbers from duration
    time = time.replaceAll(RegExp(r'[^0-9]'), ' ');
    List<String> timeList = time.split(' ');
    // Remove empty elements
    timeList.removeWhere((element) => element.isEmpty);
    String hours = timeList.length == 1 ? '0' : timeList[0];
    // Get minutes in two digits
    String minutes = timeList.length == 1 ? timeList[0] : timeList[1];
    String duration = '';
    if (hours == '0') {
      duration = '${minutes}min';
    } else if (minutes == '0') {
      duration = '${hours}h';
    } else {
      duration = '${hours}h${minutes.length == 1 ? '0$minutes' : minutes}';
    }
    return duration;
  }
}
