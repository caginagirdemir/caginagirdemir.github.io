#pragma once

#include <string>
#include <iostream>

class ATarget;

class ASpell {
	private:
		std::string name;
		std::string effects;
	public:
		ASpell(std::string _name, std::string _effects) : name(_name), effects(_effects) {}
		virtual ~ASpell() {}

		std::string getName() const {return name;}
		std::string getEffects() const {return effects;}
		
		virtual ASpell *clone() const = 0;

		void launch(const ATarget &atargetref) const;		
};

#include "ATarget.hpp"
