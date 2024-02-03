import 'dart:ui';
import 'dart:developer' as developer;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class BlurryListDialog extends StatelessWidget {
  final List<dynamic> infos;
  final VoidCallback continueCallBack;

  BlurryListDialog(this.infos, this.continueCallBack, {Key? key})
      : super(key: key);
  final TextStyle textStyle = const TextStyle(color: Colors.black);

  @override
  Widget build(BuildContext context) {
    return BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
      child: AlertDialog(
        content: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height *
                0.8, // Set max height to 80% of the screen height
          ),
          child: SingleChildScrollView(
            child: Column(
              children: infos.map((info) {
                return GestureDetector(
                  onTap: () async {
                    if (await canLaunchUrl(info['source'])) {
                      await launchUrl(info['source']);
                    } else {
                      developer.log('Could not launch ${info['source']}');
                    }
                  },
                  child: Container(
                    width: MediaQuery.of(context)
                        .size
                        .width, // Set width to the screen width
                    margin: const EdgeInsets.all(10.0),
                    padding: const EdgeInsets.all(10.0),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(10.0),
                    ),
                    child: Column(
                      children: [
                        Text(
                          info['title'],
                          style: textStyle.copyWith(
                            fontWeight: FontWeight.bold,
                            fontSize: 18.0,
                            color: Colors.blue[800],
                          ),
                        ),
                        const SizedBox(height: 10.0),
                        Text(
                          info['message'],
                          style: textStyle.copyWith(
                            fontSize: 16.0,
                            color: Colors.black,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: continueCallBack,
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

class BlurryDialog extends StatelessWidget {
  String title;
  String content;
  VoidCallback continueCallBack;

  BlurryDialog(this.title, this.content, this.continueCallBack, {super.key});
  TextStyle textStyle = const TextStyle(color: Colors.black);

  @override
  Widget build(BuildContext context) {
    return BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
        child: AlertDialog(
          title: Text(
            title,
            style: textStyle,
          ),
          content: Text(
            content,
            style: textStyle,
          ),
          actions: <Widget>[
            TextButton(
              child: const Text("OK"),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ],
        ));
  }
}
