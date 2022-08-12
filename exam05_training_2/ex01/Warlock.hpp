#pragma once

#include <string>
#include <iostream>
#include <map>

#include "ASpell.hpp"
#include "ATarget.hpp"

class Warlock {
	private: 
		std::string name;
		std::string title;
		std::map<std::string, ASpell *> spell_array;
	public:
		Warlock(std::string _name, std::string _title) : name(_name),  title(_title) { std::cout << name << ": This looks like another boring day.\n"; }
		~Warlock() { 
			std::map<std::string, ASpell *>::iterator it_begin = spell_array.begin();
			std::map<std::string, ASpell *>::iterator it_end = spell_array.end();
		while(it_begin != it_end)
		{
			delete it_begin->second;
			++it_begin;
		}
		spell_array.clear();
		std::cout << name << ": My job here is done!\n"; }

		std::string const &getName() const {return name;}
		std::string const &getTitle() const {return title;}

		void setTitle(std::string const &_title) {title = _title;}
		
		void introduce() const;

		void learnSpell(ASpell *aspellptr) {
			if(aspellptr)
				spell_array[aspellptr->getName()] = aspellptr;
		}

		void forgetSpell(std::string spellname) {
			std::map<std::string, ASpell *>::iterator it = spell_array.find(spellname);
			if(it != spell_array.end())
				delete it->second;
			spell_array.erase(spellname);
		}

		void launchSpell(std::string spellname, ATarget &atargetref){
			ASpell *spell = spell_array[spellname];
			if(spell)
				spell->launch(atargetref);
		}

};
