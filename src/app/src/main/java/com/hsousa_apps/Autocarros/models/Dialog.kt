package com.hsousa_apps.Autocarros.models

import android.app.AlertDialog
import android.app.Dialog
import android.content.DialogInterface
import android.os.Bundle
import android.view.KeyEvent
import androidx.appcompat.app.AppCompatDialogFragment

class Dialog (var title: String, var message: String, var positive: String, var onClick: DialogInterface.OnClickListener, var negative: String? = null, var dismiss: DialogInterface.OnClickListener = DialogInterface.OnClickListener { dialog, which ->  }) : AppCompatDialogFragment() {
    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        var builder = AlertDialog.Builder(activity)
        builder.setTitle(title)
            .setMessage(message)
            .setPositiveButton(positive, onClick)
            .setNegativeButton(negative, dismiss)
            .setCancelable(false)
        return builder.create()
    }
}