#include "ATarget.hpp"

void ATarget::getHitBySpell(const ASpell &aspellref) const {
	std::cout << type << " has been " << aspellref.getEffects() << "!\n";
}
