import 'package:flutter/material.dart';
import 'package:my_app/constants.dart';
import 'package:my_app/screens/search/search_screen.dart';
import 'package:my_app/screens/vote/vote_screen.dart';
import 'package:my_app/screens/home/home.dart';
import 'package:my_app/screens/watched/watched_screen.dart';
import 'package:my_app/screens/profile/profile_screen.dart';

class NavBar extends StatefulWidget {
  const NavBar({Key? key}) : super(key: key);

  @override
  State<NavBar> createState() => _NavBarState();
}

class _NavBarState extends State<NavBar> {
  int _index = 2;

  final List<Widget> _pages = [
    SearchScreen(),
    PageStorage(
      bucket: PageStorageBucket(),
      child: VoteScreen(),
    ),
    HomeScreen(),
    WatchedScreen(),
    ProfileScreen()
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: _pages,
      ),
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          indicatorColor: selectNavBar,
          indicatorShape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          backgroundColor: primaryNavBar,
        ),
        child: NavigationBar(
          height: 80,
          selectedIndex: _index,
          onDestinationSelected: (index) {
            setState(() {
              _index = index;
              if (_index == 1) {
                // Refresh VoteScreen when selected
                _pages[1] = PageStorage(
                  bucket: PageStorageBucket(),
                  child: VoteScreen(),
                );
              }
            });
          },
          labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
          destinations: [
            NavigationDestination(
              icon: Image.asset('assets/icons/search.png'),
              selectedIcon: Container(
                decoration: BoxDecoration(
                  color: selectNavBar,
                  borderRadius: BorderRadius.all(Radius.circular(20)),
                  shape: BoxShape.rectangle
                ),
                child: Padding(padding: EdgeInsets.all(16), child: Image.asset('assets/icons/search.png'))
              ),
              label: 'Search Page'
            ),
            NavigationDestination(
              icon: Image.asset('assets/icons/checkbox.png'),
              selectedIcon: Container(
                decoration: BoxDecoration(
                  color: selectNavBar,
                  borderRadius: BorderRadius.all(Radius.circular(20)),
                  shape: BoxShape.rectangle
                ),
                child: Padding(padding: EdgeInsets.all(16), child: Image.asset('assets/icons/checkbox.png'))
              ),
              label: 'Voting Page'
            ),
            NavigationDestination(
              icon: Image.asset('assets/icons/home.png'),
              selectedIcon: Container(
                decoration: BoxDecoration(
                  color: selectNavBar,
                  borderRadius: BorderRadius.all(Radius.circular(20)),
                  shape: BoxShape.rectangle
                ),
                child: Padding(padding: EdgeInsets.fromLTRB(13, 14, 13, 15), child: Image.asset('assets/icons/home.png'))
              ),
              label: 'Home Page'
            ),
            NavigationDestination(
              icon: Image.asset('assets/icons/watched.png'),
              selectedIcon: Container(
                decoration: BoxDecoration(
                  color: selectNavBar,
                  borderRadius: BorderRadius.all(Radius.circular(20)),
                  shape: BoxShape.rectangle
                ),
                child: Padding(
                  padding: EdgeInsets.fromLTRB(10, 20, 10, 20),
                  child: Image.asset('assets/icons/watched.png')
                )
              ),
              label: 'Watched Page'
            ),
            NavigationDestination(
              icon: Image.asset('assets/icons/profile.png'),
              selectedIcon: Container(
                decoration: BoxDecoration(
                  color: selectNavBar,
                  borderRadius: BorderRadius.all(Radius.circular(20)),
                  shape: BoxShape.rectangle
                ),
                child: Padding(padding: EdgeInsets.fromLTRB(18, 14, 18, 14), child: Image.asset('assets/icons/profile.png'))
              ),
              label: 'Profile Page'
            ),
          ],
        ),
      ),
    );
  }
}
