import 'package:flutter/material.dart';
import 'package:saomiguelbus/models/instruction.dart';

class CardInstruction {
  ExpansionTile getInstructionWidget(StepRoute instructions) {
    Icon leadingIcon = const Icon(
        Icons.directions_bus); //TODO: Vary the icon based on the travel mode
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
              leading: leadingIcon,
              title: Text(instructions.legs[0].steps[index].instructions),
            );
          },
        ),
      ],
    );
  }
}
