#pragma once

#include <string>
#include <iostream>
#include <map>

#include "ASpell.hpp"
#include "ATarget.hpp"

#include "SpellBook.hpp"

class Warlock {
	private: 
		std::string name;
		std::string title;
		SpellBook spell_book;
	public:
		Warlock(std::string _name, std::string _title) : name(_name),  title(_title) { std::cout << name << ": This looks like another boring day.\n"; }
		~Warlock() { 
		std::cout << name << ": My job here is done!\n"; }

		std::string const &getName() const {return name;}
		std::string const &getTitle() const {return title;}

		void setTitle(std::string const &_title) {title = _title;}
		
		void introduce() const;

		void learnSpell(ASpell *aspellptr) {
			spell_book.learnSpell(aspellptr);
		}

		void forgetSpell(std::string spellname) {
			spell_book.forgetSpell(spellname);
		}

		void launchSpell(std::string spellname, ATarget &atargetref){
			ATarget const *test = 0;
			if(test == &atargetref)
				return;
			ASpell *temp = spell_book.createSpell(spellname);
			if(temp)
				temp->launch(atargetref);
		}

};
