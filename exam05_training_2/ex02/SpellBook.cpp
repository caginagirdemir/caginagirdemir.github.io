#include "SpellBook.hpp"

void SpellBook::learnSpell(ASpell *aspellptr) {
	if(aspellptr)
		spellbook_array[aspellptr->getName()] = aspellptr->clone();
}

void SpellBook::forgetSpell(std::string const &spellname) {
	std::map<std::string, ASpell *>::iterator it = spellbook_array.find(spellname);
	if (it != spellbook_array.end())
		delete it->second;
	spellbook_array.erase(spellname);
}

ASpell *SpellBook::createSpell(std::string const &spellname) {
	std::map<std::string, ASpell *>::iterator it = spellbook_array.find(spellname);
	if (it != spellbook_array.end())
		return it->second;
	return NULL;
}
