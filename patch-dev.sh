#!/bin/bash

mkdir -p ~/.config/spicetify/CustomApps/walktify

cp index.js style.css manifest.json ~/.config/spicetify/CustomApps/walktify/
cp walkyNav.js ~/.config/spicetify/Extensions/

spicetify config custom_apps walktify

spicetify apply enable-devtools