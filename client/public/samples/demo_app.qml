import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

/* R3L:F — QML Sample
   A minimal Qt Quick UI component for testing QML preview */

ApplicationWindow {
    visible: true
    width: 480
    height: 320
    title: "R3L:F Drift Monitor"

    background: Rectangle {
        color: "#07080f"
    }

    ColumnLayout {
        anchors.centerIn: parent
        spacing: 16

        Text {
            text: "R3L:F"
            font.family: "Syne"
            font.pixelSize: 32
            font.weight: Font.Bold
            color: "#26de81"
            Layout.alignment: Qt.AlignHCenter
        }

        Rectangle {
            width: 200
            height: 2
            color: "#2a2f3a"
            Layout.alignment: Qt.AlignHCenter
        }

        Text {
            text: "Signal strength: 0.74"
            font.family: "IBM Plex Mono"
            font.pixelSize: 13
            color: "#7a7870"
            Layout.alignment: Qt.AlignHCenter
        }

        Button {
            text: "INITIALIZE SIGNAL"
            font.family: "Syne"
            font.weight: Font.Bold
            font.pixelSize: 13
            letterSpacing: 1.5
            highlighted: true
            Layout.alignment: Qt.AlignHCenter

            background: Rectangle {
                color: "#26de81"
                radius: 4
            }
            contentItem: Text {
                text: parent.text
                color: "#000"
                font: parent.font
            }
        }
    }
}
