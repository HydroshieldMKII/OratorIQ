# Vagrantfile to provision OratorIQ environment

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  
  config.vm.provider "virtualbox" do |v|
    v.memory = 4096
    v.cpus = 2
  end

  config.vm.synced_folder "app/", "/app"

  config.vm.provision "shell", path: "setup.sh"

  config.vm.network "private_network", type: "dhcp" # Networking setup
end
