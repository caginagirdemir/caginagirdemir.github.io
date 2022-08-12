#pragma once

#include <string>
#include <iostream>

class ASpell;

class ATarget {
	private:
		std::string type;
	
	public:	
		ATarget(std::string _type) : type(_type) {}
		virtual ~ATarget() {}
		const std::string &getType() const {return type;}

		virtual ATarget *clone() const = 0;

		void getHitBySpell(const ASpell &aspellref) const;
};

#include "ASpell.hpp"
