#pragma once

#include <string>
#include <iostream>

class Warlock {
	private: 
		std::string name;
		std::string title;
	public:
		Warlock(std::string _name, std::string _title) : name(_name),  title(_title) { std::cout << name << ": This looks like another boring day.\n"; }
		~Warlock() { std::cout << name << ": My job here is done!\n"; }

		std::string const &getName() const {return name;}
		std::string const &getTitle() const {return title;}

		void setTitle(std::string const &_title) {title = _title;}
		
		void introduce() const;

};
