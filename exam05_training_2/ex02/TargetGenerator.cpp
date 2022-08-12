#include "TargetGenerator.hpp"

void TargetGenerator::learnTargetType(ATarget *atargetptr) {
	if(atargetptr)
		target_array[atargetptr->getType()] = atargetptr->clone();
}

void TargetGenerator::forgetTargetType(std::string const &atargetname) {
	std::map<std::string, ATarget *>::iterator it = target_array.find(atargetname);
	if (it != target_array.end())
		delete it->second;
	target_array.erase(atargetname);
}

ATarget *TargetGenerator::createTarget(std::string const &atargetname) {
	std::map<std::string, ATarget *>::iterator it = target_array.find(atargetname);
	if (it != target_array.end())
		return it->second;
	return NULL;
}
