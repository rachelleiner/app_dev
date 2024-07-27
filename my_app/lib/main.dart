import 'package:flutter/material.dart';
import 'package:my_app/screens/welcome/welcome_screen.dart';
import 'package:my_app/constants.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Large Project',
      theme: ThemeData(
        primaryColor: primaryRed,
        scaffoldBackgroundColor: primaryBackground,
      ),
      home: WelcomeScreen(),
    );
  }
}
