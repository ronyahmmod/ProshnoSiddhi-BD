import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

void main() {
  runApp(const ProshnosiddhiApp());
}

class ProshnosiddhiApp extends StatelessWidget {
  const ProshnosiddhiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PROSHNOSIDDHI BD',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF059669),
          primary: const Color(0xFF059669),
          secondary: const Color(0xFF0F172A),
        ),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      home: const MainNavigationScreen(),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const HomeScreen(),
    const QuestionBankScreen(),
    const AnalyticsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: Color(0xFF059669)),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book, color: Color(0xFF059669)),
            label: 'Q-Bank',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights, color: Color(0xFF059669)),
            label: 'Analytics',
          ),
        ],
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  final List<Map<String, dynamic>> subjects = const [
    {'name': 'বাংলা ভাষা ও সাহিত্য', 'icon': Icons.menu_book, 'count': '2,450 Qs', 'color': Color(0xFF059669)},
    {'name': 'English Language & Lit', 'icon': Icons.language, 'count': '2,100 Qs', 'color': Color(0xFF2563EB)},
    {'name': 'বাংলাদেশ বিষয়াবলী', 'icon': Icons.public, 'count': '1,980 Qs', 'color': Color(0xFFD97706)},
    {'name': 'আন্তর্জাতিক বিষয়াবলী', 'icon': Icons.travel_explore, 'count': '1,650 Qs', 'color': Color(0xFF7C3AED)},
    {'name': 'গাণিতিক যুক্তি ও মানসিক দক্ষতা', 'icon': Icons.calculate, 'count': '1,890 Qs', 'color': Color(0xFFDC2626)},
    {'name': 'সাধারণ বিজ্ঞান ও প্রযুক্তি', 'icon': Icons.biotech, 'count': '1,420 Qs', 'color': Color(0xFF0D9488)},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'PROSHNOSIDDHI BD',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 0.5),
            ),
            Text(
              'BCS & Govt Job Smart Prep',
              style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none, color: Colors.white),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Daily Streak & Target Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF059669).withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.bolt, color: Color(0xFF34D399), size: 24),
                          ),
                          const SizedBox(width: 12),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Target: 47th BCS Prelims',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              Text(
                                'Daily Quota: Unlimited Pro Pass',
                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD97706),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'PRO VIP',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 10),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const QuizScreen(subject: '47th BCS Full Model Test'),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 44),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.play_arrow, size: 20),
                    label: const Text('Start 100-Mark Live Mock Test', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Text(
              'Select Subject for Quick Practice',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 12),

            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: subjects.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.25,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemBuilder: (context, index) {
                final sub = subjects[index];
                return InkWell(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => QuizScreen(subject: sub['name'] as String),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: (sub['color'] as Color).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(sub['icon'] as IconData, color: sub['color'] as Color, size: 22),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              sub['name'] as String,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F172A)),
                            ),
                            Text(
                              sub['count'] as String,
                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class QuestionBankScreen extends StatelessWidget {
  const QuestionBankScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Question Bank (বিসিএস প্রশ্নব্যাংক)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Colors.white,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 8,
        itemBuilder: (context, index) {
          final bcsNum = 46 - index;
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
            color: const Color(0xFFF8FAFC),
            child: ListTile(
              title: Text('$bcsNum তম বিসিএস প্রিলিমিনারি প্রশ্ন সমাধান', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: const Text('200 প্রশ্নাবলী • পূর্ণাঙ্গ ব্যাখ্যাসহ', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFF94A3B8)),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => QuizScreen(subject: '$bcsNum তম বিসিএস প্রিলিমিনারি'),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Preparation Analytics', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      Text('84.2%', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                      Text('Overall Accuracy', style: TextStyle(fontSize: 11, color: Color(0xFF065F46), fontWeight: FontWeight.bold)),
                    ],
                  ),
                  Column(
                    children: [
                      Text('1,240', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                      Text('Questions Solved', style: TextStyle(fontSize: 11, color: Color(0xFF475569), fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('Weak Area Focus: International Affairs & Math', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }
}

class QuizScreen extends StatefulWidget {
  final String subject;
  const QuizScreen({super.key, required this.subject});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  int _questionIndex = 0;
  int _score = 0;
  int? _selectedOption;
  bool _submitted = false;

  final List<Map<String, dynamic>> questions = [
    {
      'question': 'বঙ্গভঙ্গ রদ ঘোষণা করা হয় কোন সালে?',
      'options': ['১৯০৫ সালে', '১৯১১ সালে', '১৯৪৭ সালে', '১৯৫২ সালে'],
      'correct': 1,
      'explanation': '১৯১১ সালের ১২ ডিসেম্বর দিল্লির দরবারে সম্রাট পঞ্চম জর্জ বঙ্গভঙ্গ রদের রাজকীয় ঘোষণা দেন।',
    },
    {
      'question': '‘চর্যাপদ’ কোন ছন্দে রচিত?',
      'options': ['পয়ার ছন্দে', 'মাত্রাবৃত্ত ছন্দে', 'অক্ষরবৃত্ত ছন্দে', 'স্বরবৃত্ত ছন্দে'],
      'correct': 1,
      'explanation': 'হরপ্রসাদ শাস্ত্রী কর্তৃক আবিষ্কৃত চর্যাপদ মূলত মাত্রাবৃত্ত বা পাদাকুলক ছন্দে রচিত।',
    },
  ];

  @override
  Widget build(BuildContext context) {
    if (_questionIndex >= questions.length) {
      return Scaffold(
        appBar: AppBar(title: const Text('Exam Result')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, size: 80, color: Color(0xFF059669)),
              const SizedBox(height: 16),
              const Text('Quiz Completed!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Score: $_score / ${questions.length}', style: const TextStyle(fontSize: 16, color: Color(0xFF64748B))),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Back to Home'),
              ),
            ],
          ),
        ),
      );
    }

    final q = questions[_questionIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.subject, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Question ${_questionIndex + 1} of ${questions.length}', style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(q['question'], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
            const SizedBox(height: 16),

            ...List.generate(q['options'].length, (i) {
              final isSelected = _selectedOption == i;
              final isCorrect = q['correct'] == i;
              Color borderCol = const Color(0xFFE2E8F0);
              Color bgCol = Colors.white;

              if (_submitted) {
                if (isCorrect) {
                  borderCol = const Color(0xFF059669);
                  bgCol = const Color(0xFFECFDF5);
                } else if (isSelected) {
                  borderCol = const Color(0xFFDC2626);
                  bgCol = const Color(0xFFFEF2F2);
                }
              } else if (isSelected) {
                borderCol = const Color(0xFF059669);
                bgCol = const Color(0xFFF0FDF4);
              }

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  onTap: _submitted
                      ? null
                      : () {
                          setState(() {
                            _selectedOption = i;
                          });
                        },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: bgCol,
                      border: Border.all(color: borderCol, width: 1.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Text(String.fromCharCode(65 + i), style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                        const SizedBox(width: 12),
                        Expanded(child: Text(q['options'][i], style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                      ],
                    ),
                  ),
                ),
              );
            }),

            if (_submitted) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(12)),
                child: Text('💡 ব্যাখ্যা: ${q['explanation']}', style: const TextStyle(color: Color(0xFF1E40AF), fontSize: 12)),
              ),
            ],

            const Spacer(),
            ElevatedButton(
              onPressed: _selectedOption == null
                  ? null
                  : () {
                      if (!_submitted) {
                        setState(() {
                          _submitted = true;
                          if (_selectedOption == q['correct']) {
                            _score++;
                          }
                        });
                      } else {
                        setState(() {
                          _submitted = false;
                          _selectedOption = null;
                          _questionIndex++;
                        });
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F172A),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(_submitted ? 'Next Question →' : 'Submit Answer', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
