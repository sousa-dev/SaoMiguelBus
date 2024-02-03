import 'package:flutter/material.dart';
import 'package:saomiguelbus/widgets/alert_dialog.dart';

showInfosDialog(BuildContext context, List<dynamic> infos,
    {VoidCallback? continueCallBack}) {
  continueCallBack ??= () {
    Navigator.of(context).pop();
  };

  BlurryListDialog alert = BlurryListDialog(infos, continueCallBack);

  showDialog(
    context: context,
    builder: (BuildContext context) {
      return alert;
    },
  );
}

showDialogWindow(BuildContext context, String title, String content,
    {VoidCallback? continueCallBack}) {
  continueCallBack ??= () {
    Navigator.of(context).pop();
  };

  BlurryDialog alert = BlurryDialog(title, content, continueCallBack);

  showDialog(
    context: context,
    builder: (BuildContext context) {
      return alert;
    },
  );
}
