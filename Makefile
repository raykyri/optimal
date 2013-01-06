clean:
	rm *.class

run: all
	java OptimalApp

all: OptimalApp.class

OptimalApp.class: OptimalApp.java
	javac OptimalApp.java
