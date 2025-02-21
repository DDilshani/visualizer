
import * as THREE from 'three';
import TWEEN, { update } from '@tweenjs/tween.js';

import Config from '../../data/config';
import MQTT from 'paho-mqtt';

// -----------------------------------------------------------------------------
// MQTT Topics
// -----------------------------------------------------------------------------
// This will provide location data to the GUI
const TOPIC_INFO = 'v1/localization/info';

// Create and delete robot objects
const TOPIC_CREATE = 'v1/robot/create';
const TOPIC_DELETE = 'v1/robot/delete';

// This will request the localization data update from the server
const TOPIC_LOC_REQUEST = 'v1/localization/?';

// TODO: need to map with the server
const TOPIC_CHANGE_COLOR = 'v1/sensor/color';

// -----------------------------------------------------------------------------

export default class MQTTClient {

    constructor(scene, robot) {

        this.scene = scene;
        this.robot = robot;

        const client_id = 'client_' + Math.random().toString(36).substring(2, 15); // create a random client Id
        this.client = new MQTT.Client(Config.mqtt.server, Config.mqtt.port, Config.mqtt.path, client_id);

        window.mqtt = this.client;

        this.client.connect({
            userName: Config.mqtt.user,
            password: Config.mqtt.password,
            reconnect: true,
            useSSL: true,
            cleanSession : false,
            onSuccess: () => {
                console.log('MQTT: connected');

                // Subscribe to topics
                this.client.subscribe(TOPIC_INFO);
                this.client.subscribe(TOPIC_CREATE);
                this.client.subscribe(TOPIC_DELETE);
                this.client.subscribe(TOPIC_CHANGE_COLOR);

                window.robot = this.robot;
                this.client.onMessageArrived = this.onMessageArrived;
                this.client.onConnectionLost = this.onConnectionLost;
            },
            onFailure: ()=>{
                console.log('MQTT: connection failed');
            }
        });
    }

    onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("MQTT: onConnectionLost:" + responseObject.errorMessage);
            console.log('MQTT: reconnecting');
        }
    }

    onMessageArrived(packet) {
        const msg = packet.payloadString.trim();
        const topic = packet.destinationName;

        if (topic == TOPIC_CREATE) {
            //console.log('MQTT: ' + topic + ' > ' + msg);
            try {
                var data = JSON.parse(msg);
                window.robot.create(data.id, data.x, data.y, data.heading)
            } catch (e) {
                console.error(e);
            }

        }else if(topic == TOPIC_DELETE){
            try {
                var data = JSON.parse(msg);
                window.robot.delete(data.id)
            } catch (e) {
                console.error(e);
            }

        } else if (topic == TOPIC_INFO) {
            //console.log('MQTT: ' + topic + ' > ' + msg);
            try {
                var data = JSON.parse(msg);

                Object.entries(data).forEach(entry => {
                    // Update each robot
                    const r = entry[1];

                    if(window.robot.exists(r.id)==undefined){
                        window.robot.create(r.id, r.x, r.y, r.heading);
                    }else{
                        window.robot.move(r.id, r.x, r.y, r.heading);
                    }
                });
            } catch (e) {
                console.error(e);
            }
        } else if (topic == TOPIC_CHANGE_COLOR) {
            try {
                var data = JSON.parse(msg);
                window.robot.changeColor(data.id, data.R, data.G, data.B, data.ambient);
            } catch (e) {
                console.error(e);
            }
        }
    }

    publish(topic, message, callback) {
        var payload = new MQTT.Message(message);
        payload.destinationName = topic;
        this.client.send(payload);
        console.log('MQTT: published');

        if (callback != null) callback();
    }

}
