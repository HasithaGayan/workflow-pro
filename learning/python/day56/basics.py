
name = "WorkFlow Pro"
passed_tests = 15
total_tests = 15

def check_tests(passed, total):
    if passed == total:
        return "All tests passed!"
    else:
        return "Some tests failed."

print("Project:", name)
print(check_tests(passed_tests, total_tests))

for number in range(1, 4):
    print("Python practice:", number)
