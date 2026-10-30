# PRESTIGE INTERIOR DESIGN WEBSITE

# Commands:

How to run the springboot via commandline / powershell?<br>
<br>.\mvnw clean
<br>.\mvnw spring-boot:run
<br><br><br>
How to view localhost?
<br>Example: http://localhost:8080/index3.html

===============================================================

# Take note: 
1. **Do not change the root directory name from src to Springboot.** 

===============================================================

# Things to change after you pull: 
1. Under this directory "...src\main\resources\application.properties" 

Change 3 things to your local settings
<br>spring.datasource.url=jdbc:mysql://localhost:3306/**prestigedb**?useSSL=false&serverTimezone=UTC
<br>spring.datasource.username=**root** 
<br>spring.datasource.password=**root**

** Remember to powerup your MySQL workbench when you run localhost.
