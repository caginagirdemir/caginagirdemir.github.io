#pragma once

#include "ASpell.hpp"

#include <map>

class SpellBook {
	
	private:
		std::map<std::string, ASpell *> spellbook_array;
	
	public:
		SpellBook() {}
		~SpellBook() {
			std::map<std::string, ASpell *>::iterator it_begin = spellbook_array.begin();
			std::map<std::string, ASpell *>::iterator it_end = spellbook_array.end();
			while(it_begin != it_end) {
				delete it_begin->second;
				++it_begin;
			}
			spellbook_array.clear();
		}

		void learnSpell(ASpell *aspellptr);
		void forgetSpell(std::string const &spellname);		
		ASpell *createSpell(std::string const &spellname);
};
