import 'package:flutter/material.dart';
import 'package:saomiguelbus/models/instruction.dart';

class CardInstruction {
  ExpansionTile getInstructionWidget(StepRoute instructions) {
    //TODO: Get Leave the bus at X step
    return ExpansionTile(
      iconColor: Colors.blue,
      textColor: Colors.black,
      title: Text(instructions.legs[0].duration),
      children: [
        ListView.builder(
          physics: const ScrollPhysics(parent: null),
          shrinkWrap: true,
          itemCount: instructions.legs[0].steps.length,
          itemBuilder: (BuildContext context, int index) {
            return ListTile(
              leading:
                  _getLeadingIcon(instructions.legs[0].steps[index].travelMode),
              title: Text(instructions.legs[0].steps[index].instructions),
            );
          },
        ),
      ],
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
}
