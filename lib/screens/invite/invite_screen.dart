import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class InvitesPage extends StatefulWidget {
  @override
  _InvitesPageState createState() => _InvitesPageState();
}

class _InvitesPageState extends State<InvitesPage> {
  List invites = [];

  @override
  void initState() {
    super.initState();
    fetchInvites();
  }

  Future<String?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('userId');
  }

  Future<void> fetchInvites() async {
    
  final userId = await getUserId();

  if (userId == null) {
    print('Poll ID is null');
    return;
  }
  final url = Uri.parse('https://cod-destined-secondly.ngrok-free.app/api/invitations/$userId');

  try {
    final response = await http.get(url);

    if (response.statusCode == 200) {
      setState(() {
        invites = jsonDecode(response.body);
      });
    } else {
      print('Failed to fetch invite data: ${response.body}');
    }
  } catch (e) {
    print('Error: $e');
  }
}

  respondToInvite(String invitationId, String status) async {
    final url = Uri.parse('https://cod-destined-secondly.ngrok-free.app/api/invitations/respond');
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'invitationId': invitationId, 'status': status}),
    );

    if (response.statusCode == 200) {
      fetchInvites();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Invitations'),
      ),
      body: ListView.builder(
        itemCount: invites.length,
        itemBuilder: (context, index) {
          return ListTile(
            title: Text(invites[index]['partyId']['name']),
            subtitle: Text('From: ${invites[index]['senderId']['name']}'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: Icon(Icons.check),
                  onPressed: () => respondToInvite(invites[index]['_id'], 'accepted'),
                ),
                IconButton(
                  icon: Icon(Icons.clear),
                  onPressed: () => respondToInvite(invites[index]['_id'], 'declined'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
